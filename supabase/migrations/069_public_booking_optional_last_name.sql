-- P3-13 (D-04): the last name is optional on the public pages. Both booking
-- RPCs rejected an empty one as invalid_input. They are the live definitions
-- with only that check removed and a NULL-safe insert; an empty last name is
-- stored as '' (customers.last_name stays NOT NULL).

CREATE OR REPLACE FUNCTION public.create_public_booking(p_org_id uuid, p_service_id uuid, p_staff_id uuid, p_date date, p_start time without time zone, p_first_name text, p_last_name text, p_phone text, p_email text, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c_max_future_bookings CONSTANT INTEGER := 3;
  v_tz TEXT;
  v_phone_key TEXT;
  v_duration INTEGER;
  v_occupied INTEGER;
  v_requires_approval BOOLEAN;
  v_staff_id UUID;
  v_customer_id UUID;
  v_future_count INTEGER;
  v_appointment_id UUID;
  v_appointment_number TEXT;
  v_status public.appointment_status;
BEGIN
  -- Serialize web bookings per organization: prevents two bookings on the
  -- same time and the MAX()+1 race of generate_appointment_number.
  PERFORM pg_advisory_xact_lock(hashtextextended('public_booking:' || p_org_id::TEXT, 0));

  IF NOT public.public_booking_org_open(p_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_closed');
  END IF;

  v_phone_key := public.booking_phone_key(p_phone, NULL);
  IF btrim(COALESCE(p_first_name, '')) = ''
     OR length(COALESCE(p_first_name, '')) > 80
     OR length(COALESCE(p_last_name, '')) > 80
     OR length(COALESCE(p_email, '')) > 254
     OR length(COALESCE(p_notes, '')) > 500
     OR COALESCE(length(v_phone_key), 0) NOT BETWEEN 8 AND 15 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_input');
  END IF;

  SELECT COALESCE(o.timezone, 'UTC') INTO v_tz
  FROM public.organizations o
  WHERE o.id = p_org_id;

  SELECT s.duration_minutes,
         s.duration_minutes + COALESCE(s.buffer_time_minutes, 0),
         COALESCE(s.requires_approval, false)
    INTO v_duration, v_occupied, v_requires_approval
  FROM public.services s
  WHERE s.id = p_service_id
    AND s.organization_id = p_org_id
    AND COALESCE(s.is_active, false)
    AND COALESCE(s.available_for_online_booking, false);

  IF v_duration IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'service_unavailable');
  END IF;

  -- The time must be one the page offers (same function, under the lock)
  SELECT sl.staff_id INTO v_staff_id
  FROM public.public_booking_slots(p_org_id, p_service_id, p_staff_id, p_date) sl
  WHERE sl.start_time = p_start
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'slot_taken');
  END IF;

  -- Anti-abuse: active future bookings of this phone in the organization
  SELECT count(*) INTO v_future_count
  FROM public.appointments ap
  JOIN public.customers c ON c.id = ap.customer_id
  WHERE ap.organization_id = p_org_id
    AND public.booking_phone_key(c.phone, c.phone_country_code) = v_phone_key
    AND ap.status IN (
      'pending', 'confirmed', 'reminded',
      'client_confirmed', 'checked_in', 'in_progress'
    )
    AND ap.appointment_date + ap.start_time >= now() AT TIME ZONE v_tz;

  IF v_future_count >= c_max_future_bookings THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_bookings');
  END IF;

  -- Reuse the customer by phone (active first, then most recent);
  -- existing data is never overwritten.
  SELECT c.id INTO v_customer_id
  FROM public.customers c
  WHERE c.organization_id = p_org_id
    AND public.booking_phone_key(c.phone, c.phone_country_code) = v_phone_key
  ORDER BY c.is_active DESC NULLS LAST, c.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (
      organization_id, first_name, last_name, phone, email, is_active
    )
    VALUES (
      p_org_id,
      btrim(p_first_name),
      btrim(COALESCE(p_last_name, '')),
      '+' || v_phone_key,
      NULLIF(btrim(COALESCE(p_email, '')), ''),
      true
    )
    RETURNING id INTO v_customer_id;
  END IF;

  v_status := CASE WHEN v_requires_approval THEN 'pending' ELSE 'confirmed' END;

  -- end_time includes the buffer, same as AppointmentService.calculateEndTime
  INSERT INTO public.appointments (
    organization_id, customer_id, service_id, staff_id,
    appointment_date, start_time, end_time,
    status, source, timezone, notes
  )
  VALUES (
    p_org_id, v_customer_id, p_service_id, v_staff_id,
    p_date, p_start,
    public.booking_min_to_time(public.booking_time_to_min(p_start) + v_occupied),
    v_status, 'web', v_tz, NULLIF(btrim(COALESCE(p_notes, '')), '')
  )
  RETURNING id, appointment_number INTO v_appointment_id, v_appointment_number;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment_id,
    'appointment_number', v_appointment_number,
    'status', v_status,
    'staff_id', v_staff_id,
    'date', p_date,
    'start_time', p_start
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_trip_booking(p_org_id uuid, p_trip_id uuid, p_seats integer, p_first_name text, p_last_name text, p_phone text, p_email text, p_notes text, p_passenger_names text[], p_pickup_point_id uuid DEFAULT NULL::uuid, p_round_trip boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  c_max_future_bookings CONSTANT INTEGER := 3;
  v_tz TEXT;
  v_phone_key TEXT;
  v_trip RECORD;
  v_seats_left INTEGER;
  v_customer_id UUID;
  v_future_count INTEGER;
  v_hold_hours INTEGER;
  v_status public.trip_booking_status;
  v_deposit_status public.trip_deposit_status;
  v_price_per_seat DECIMAL(10,2);
  v_deposit_per_seat DECIMAL(10,2);
  v_deposit_amount DECIMAL(10,2);
  v_hold_expires_at TIMESTAMPTZ;
  v_names TEXT[];
  v_has_points BOOLEAN;
  v_booking_id UUID;
  v_booking_number TEXT;
  v_round_trip BOOLEAN := COALESCE(p_round_trip, false);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('trip_booking:' || p_trip_id::TEXT, 0));

  IF NOT public.public_trips_org_open(p_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_closed');
  END IF;

  v_phone_key := public.booking_phone_key(p_phone, NULL);
  IF btrim(COALESCE(p_first_name, '')) = ''
     OR length(COALESCE(p_first_name, '')) > 80
     OR length(COALESCE(p_last_name, '')) > 80
     OR length(COALESCE(p_email, '')) > 254
     OR length(COALESCE(p_notes, '')) > 500
     OR COALESCE(length(v_phone_key), 0) NOT BETWEEN 8 AND 15
     OR COALESCE(p_seats, 0) < 1 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_input');
  END IF;

  SELECT tr.*, COALESCE(tr.timezone, 'UTC') AS tz
    INTO v_trip
  FROM public.trips tr
  WHERE tr.id = p_trip_id
    AND tr.organization_id = p_org_id
    AND tr.is_published
    AND tr.cancelled_at IS NULL;

  IF v_trip.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'trip_unavailable');
  END IF;

  v_tz := v_trip.tz;

  IF (v_trip.departure_date + v_trip.departure_time) < (now() AT TIME ZONE v_tz) THEN
    RETURN jsonb_build_object('success', false, 'error', 'trip_departed');
  END IF;

  IF p_seats > v_trip.max_seats_per_booking THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_seats');
  END IF;

  -- Asking for a return on a one-way departure is a stale page, not a price.
  IF v_round_trip AND NOT v_trip.round_trip_enabled THEN
    RETURN jsonb_build_object('success', false, 'error', 'round_trip_unavailable');
  END IF;

  -- When the departure has stops loaded, picking one is mandatory and it is
  -- what sets the price; otherwise the trip's own price applies.
  SELECT EXISTS (
    SELECT 1 FROM public.trip_pickup_points WHERE trip_id = p_trip_id
  ) INTO v_has_points;

  IF p_pickup_point_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.trip_pickup_points
      WHERE id = p_pickup_point_id AND trip_id = p_trip_id
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'pickup_point_invalid');
    END IF;
  ELSIF v_has_points THEN
    RETURN jsonb_build_object('success', false, 'error', 'pickup_point_required');
  END IF;

  SELECT price, deposit INTO v_price_per_seat, v_deposit_per_seat
  FROM public.trip_seat_price(p_trip_id, p_pickup_point_id, v_round_trip);

  v_names := ARRAY(
    SELECT btrim(n)
    FROM unnest(COALESCE(p_passenger_names, ARRAY[]::TEXT[])) AS n
    WHERE btrim(n) <> ''
  );
  IF cardinality(v_names) <> p_seats THEN
    RETURN jsonb_build_object('success', false, 'error', 'passenger_names_required');
  END IF;
  IF EXISTS (SELECT 1 FROM unnest(v_names) AS n WHERE length(n) > 80) THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_input');
  END IF;

  v_seats_left := GREATEST(v_trip.total_seats - public.trip_seats_taken(p_trip_id), 0);
  IF v_seats_left < p_seats THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_enough_seats',
                              'seats_left', v_seats_left);
  END IF;

  SELECT count(*) INTO v_future_count
  FROM public.trip_bookings b
  JOIN public.customers c ON c.id = b.customer_id
  JOIN public.trips tr ON tr.id = b.trip_id
  WHERE b.organization_id = p_org_id
    AND public.booking_phone_key(c.phone, c.phone_country_code) = v_phone_key
    AND b.status NOT IN ('cancelled', 'completed', 'no_show')
    AND tr.cancelled_at IS NULL
    AND (tr.departure_date + tr.departure_time) >= (now() AT TIME ZONE v_tz);

  IF v_future_count >= c_max_future_bookings THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_bookings');
  END IF;

  SELECT c.id INTO v_customer_id
  FROM public.customers c
  WHERE c.organization_id = p_org_id
    AND public.booking_phone_key(c.phone, c.phone_country_code) = v_phone_key
  ORDER BY c.is_active DESC NULLS LAST, c.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (
      organization_id, first_name, last_name, phone, email, is_active
    )
    VALUES (
      p_org_id,
      btrim(p_first_name),
      btrim(COALESCE(p_last_name, '')),
      '+' || v_phone_key,
      NULLIF(btrim(COALESCE(p_email, '')), ''),
      true
    )
    RETURNING id INTO v_customer_id;
  END IF;

  v_status := CASE WHEN v_trip.requires_approval THEN 'pending' ELSE 'confirmed' END;

  v_deposit_amount := ROUND(v_deposit_per_seat * p_seats, 2);
  IF v_deposit_amount > 0 THEN
    v_deposit_status := 'pending';
    SELECT COALESCE(bs.seat_booking_hold_hours, 24) INTO v_hold_hours
    FROM public.business_settings bs
    WHERE bs.organization_id = p_org_id;
    v_hold_expires_at := now() + make_interval(hours => GREATEST(COALESCE(v_hold_hours, 24), 1));
  ELSE
    v_deposit_status := 'waived';
    v_hold_expires_at := NULL;
  END IF;

  v_booking_number := public.generate_trip_booking_number(p_org_id);

  INSERT INTO public.trip_bookings (
    organization_id, trip_id, customer_id, booking_number, seats, passenger_names,
    status, source, price_total, deposit_amount, deposit_status, hold_expires_at,
    notes, pickup_point_id, amount_paid, trip_type
  )
  VALUES (
    p_org_id, p_trip_id, v_customer_id, v_booking_number, p_seats, v_names,
    v_status, 'web', ROUND(v_price_per_seat * p_seats, 2), v_deposit_amount,
    v_deposit_status, v_hold_expires_at, NULLIF(btrim(COALESCE(p_notes, '')), ''),
    p_pickup_point_id, 0,
    CASE WHEN v_round_trip THEN 'round_trip' ELSE 'one_way' END
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'booking_number', v_booking_number,
    'status', v_status,
    'seats', p_seats,
    'trip_type', CASE WHEN v_round_trip THEN 'round_trip' ELSE 'one_way' END,
    'price_total', ROUND(v_price_per_seat * p_seats, 2),
    'deposit_amount', v_deposit_amount,
    'deposit_status', v_deposit_status,
    'hold_expires_at', v_hold_expires_at
  );
END;
$function$;
