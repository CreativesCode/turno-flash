-- ============================================
-- 042: Round trip (ida y vuelta) at a different price
-- ============================================
-- Real agencies sell the same departure two ways: "Sagua 10 mil ida, 20 mil
-- ida y vuelta". The return is not another departure — the seat, the bus and
-- the driver are the same — so it is a property of the BOOKING, not a second
-- trip row, and the price lives next to the one-way price of each stop.
--
-- The deposit does not change: it is what the agency charges to hold the seat
-- ("1000 por cada capacidad"), not a share of the fare.

-- --------------------------------------------
-- 1. Columns
-- --------------------------------------------

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS round_trip_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_round_trip DECIMAL(10,2);

COMMENT ON COLUMN public.trips.round_trip_enabled IS
  'The departure can be sold as a return trip too. false = one way only.';
COMMENT ON COLUMN public.trips.price_round_trip IS
  'Default price per seat for a return trip. NULL = falls back to price_per_seat.';

ALTER TABLE public.trip_pickup_points
  ADD COLUMN IF NOT EXISTS price_round_trip DECIMAL(10,2);

COMMENT ON COLUMN public.trip_pickup_points.price_round_trip IS
  'Return price from this stop. NULL = the trip default.';

-- The booking remembers what was sold: the passenger list and the money owed
-- both depend on it, and the trip price can change afterwards.
ALTER TABLE public.trip_bookings
  ADD COLUMN IF NOT EXISTS trip_type TEXT NOT NULL DEFAULT 'one_way';

DO $trip_type_check$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'trip_bookings_trip_type_check'
  ) THEN
    ALTER TABLE public.trip_bookings
      ADD CONSTRAINT trip_bookings_trip_type_check
      CHECK (trip_type IN ('one_way', 'round_trip'));
  END IF;
END $trip_type_check$;

-- --------------------------------------------
-- 2. One place that resolves the price
-- --------------------------------------------
-- Extracted out of create_trip_booking so the next pricing rule does not mean
-- copying those 200 lines into yet another migration.

CREATE OR REPLACE FUNCTION public.trip_seat_price(
  p_trip_id UUID,
  p_pickup_point_id UUID,
  p_round_trip BOOLEAN
)
RETURNS TABLE (price DECIMAL(10,2), deposit DECIMAL(10,2))
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $seat_price$
  SELECT
    CASE
      WHEN p_round_trip THEN
        COALESCE(pp.price_round_trip, tr.price_round_trip, base.price)
      ELSE base.price
    END,
    base.deposit
  FROM public.trips tr
  LEFT JOIN public.trip_pickup_points pp
    ON pp.id = p_pickup_point_id AND pp.trip_id = tr.id
  CROSS JOIN LATERAL (
    SELECT COALESCE(pp.price_per_seat, tr.price_per_seat) AS price,
           COALESCE(pp.deposit_per_seat, tr.deposit_per_seat) AS deposit
  ) base
  WHERE tr.id = p_trip_id;
$seat_price$;

REVOKE EXECUTE ON FUNCTION public.trip_seat_price(UUID, UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;

-- --------------------------------------------
-- 3. The booking RPC takes the trip type
-- --------------------------------------------

DROP FUNCTION IF EXISTS public.create_trip_booking(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID
);

CREATE OR REPLACE FUNCTION public.create_trip_booking(
  p_org_id UUID,
  p_trip_id UUID,
  p_seats INTEGER,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_notes TEXT,
  p_passenger_names TEXT[],
  p_pickup_point_id UUID DEFAULT NULL,
  p_round_trip BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $create_booking$
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
     OR btrim(COALESCE(p_last_name, '')) = ''
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
    AND (tr.departure_date + tr.departure_time) >= (now() AT TIME ZONE v_tz);

  IF v_future_count >= c_max_future_bookings THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_bookings');
  END IF;

  SELECT c.id INTO v_customer_id
  FROM public.customers c
  WHERE c.organization_id = p_org_id
    AND public.booking_phone_key(c.phone, c.phone_country_code) = v_phone_key
  ORDER BY c.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (
      organization_id, first_name, last_name, phone, email, is_active
    )
    VALUES (
      p_org_id,
      btrim(p_first_name),
      btrim(p_last_name),
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
$create_booking$;

REVOKE EXECUTE ON FUNCTION public.create_trip_booking(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID, BOOLEAN
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_trip_booking(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID, BOOLEAN
) TO service_role;

-- --------------------------------------------
-- 4. The public page needs both prices
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.public_trips_info(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $trips_info$
DECLARE
  v_org RECORD;
  v_tz TEXT;
  v_trips JSONB;
BEGIN
  SELECT o.id, o.name, o.timezone, o.currency, bs.deposit_instructions
    INTO v_org
  FROM public.organizations o
  LEFT JOIN public.business_settings bs ON bs.organization_id = o.id
  WHERE o.slug = p_slug;

  IF v_org.id IS NULL OR NOT public.public_trips_org_open(v_org.id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_closed');
  END IF;

  v_tz := COALESCE(v_org.timezone, 'UTC');

  SELECT COALESCE(jsonb_agg(t ORDER BY t.departure_date, t.departure_time), '[]'::jsonb)
    INTO v_trips
  FROM (
    SELECT tr.id,
           tr.title,
           tr.description,
           tr.pickup_location,
           tr.departure_date,
           tr.departure_time,
           tr.return_time,
           tr.price_per_seat,
           tr.deposit_per_seat,
           tr.round_trip_enabled,
           COALESCE(tr.price_round_trip, tr.price_per_seat) AS price_round_trip,
           tr.currency,
           tr.requires_approval,
           tr.total_seats,
           tr.max_seats_per_booking,
           tr.driver_name,
           tr.driver_phone,
           tr.vehicle_description,
           tr.vehicle_photo_path,
           tr.booking_opens_at,
           tr.booking_closes_at,
           -- Listed even before it opens, so the page can say "opens on…".
           (tr.booking_opens_at IS NULL OR tr.booking_opens_at <= now())
             AND (tr.booking_closes_at IS NULL OR tr.booking_closes_at > now())
             AS booking_open,
           GREATEST(tr.total_seats - public.trip_seats_taken(tr.id), 0) AS seats_left,
           COALESCE((
             SELECT jsonb_agg(
                      jsonb_build_object(
                        'id', pp.id,
                        'name', pp.name,
                        'details', pp.details,
                        'pickup_time', pp.pickup_time,
                        'price_per_seat', pp.price_per_seat,
                        'price_round_trip', COALESCE(
                          pp.price_round_trip, tr.price_round_trip, pp.price_per_seat
                        ),
                        'deposit_per_seat', pp.deposit_per_seat
                      )
                      ORDER BY pp.sort_order, pp.name
                    )
             FROM public.trip_pickup_points pp
             WHERE pp.trip_id = tr.id
           ), '[]'::jsonb) AS pickup_points
    FROM public.trips tr
    WHERE tr.organization_id = v_org.id
      AND tr.is_published
      AND tr.cancelled_at IS NULL
      AND (tr.departure_date + tr.departure_time) >= (now() AT TIME ZONE v_tz)
  ) t;

  RETURN jsonb_build_object(
    'success', true,
    'organization', jsonb_build_object(
      'id', v_org.id,
      'name', v_org.name,
      'timezone', v_tz,
      'currency', COALESCE(v_org.currency, 'USD'),
      'deposit_instructions', v_org.deposit_instructions
    ),
    'trips', v_trips
  );
END;
$trips_info$;
