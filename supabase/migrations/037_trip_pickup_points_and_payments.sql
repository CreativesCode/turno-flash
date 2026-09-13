-- ============================================
-- 037: Pickup points with their own price, and real payments
-- ============================================
-- Two product decisions from the user (2026-09-12):
--
-- 1. The same departure can be sold at different prices depending on where the
--    passenger is picked up, so price and deposit move from the trip to the
--    pickup point. trips.price_per_seat / deposit_per_seat stay as the default
--    for a trip with no points loaded, which is the simple case.
--
-- 2. A passenger can pay the deposit, the whole price, or any amount in
--    between, so what gets stored is the money actually received
--    (amount_paid) and "how much is left" is derived from it.

-- --------------------------------------------
-- 1. Pickup points
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.trip_pickup_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  -- WhatsApp-style text, same as the trip description.
  details TEXT,
  -- When the bus passes by this stop, if it is not the departure time.
  pickup_time TIME,
  price_per_seat DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price_per_seat >= 0),
  deposit_per_seat DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (deposit_per_seat >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (deposit_per_seat <= price_per_seat OR price_per_seat = 0)
);

CREATE INDEX IF NOT EXISTS idx_trip_pickup_points_trip
  ON public.trip_pickup_points(trip_id, sort_order);

DROP TRIGGER IF EXISTS update_trip_pickup_points_updated_at ON public.trip_pickup_points;
CREATE TRIGGER update_trip_pickup_points_updated_at
  BEFORE UPDATE ON public.trip_pickup_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.trip_pickup_points ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read pickup points of their org" ON public.trip_pickup_points;
CREATE POLICY "Members can read pickup points of their org"
ON public.trip_pickup_points FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can manage pickup points of their org" ON public.trip_pickup_points;
CREATE POLICY "Owners can manage pickup points of their org"
ON public.trip_pickup_points FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
  AND public.org_license_usable(organization_id)
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
  AND public.org_license_usable(organization_id)
);

ALTER TABLE public.trip_pickup_points REPLICA IDENTITY FULL;

DO $realtime$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'trip_pickup_points'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_pickup_points;
  END IF;
END $realtime$;

-- --------------------------------------------
-- 2. Bookings: where they board and what they paid
-- --------------------------------------------

ALTER TABLE public.trip_bookings
  ADD COLUMN IF NOT EXISTS pickup_point_id UUID
    REFERENCES public.trip_pickup_points(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0
    CHECK (amount_paid >= 0);

COMMENT ON COLUMN public.trip_bookings.amount_paid IS
  'Money actually received. What is left to collect is price_total - amount_paid.';

-- Existing bookings: a deposit marked as paid means that much money came in.
UPDATE public.trip_bookings
SET amount_paid = COALESCE(deposit_amount, 0)
WHERE deposit_status = 'paid' AND amount_paid = 0;

-- --------------------------------------------
-- 3. deposit_status derives from the money
-- --------------------------------------------
-- One source of truth: the app writes amount_paid and this keeps the deposit
-- state (which the expiry cron reads) consistent. 'refunded' is a manual
-- decision and is never overwritten.

CREATE OR REPLACE FUNCTION public.sync_trip_deposit_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $sync_deposit$
BEGIN
  IF NEW.deposit_status = 'refunded' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.deposit_amount, 0) <= 0 THEN
    NEW.deposit_status := 'waived';
  ELSIF NEW.amount_paid >= NEW.deposit_amount THEN
    NEW.deposit_status := 'paid';
    IF NEW.deposit_paid_at IS NULL THEN
      NEW.deposit_paid_at := now();
    END IF;
    -- Paid holds never expire.
    NEW.hold_expires_at := NULL;
  ELSE
    NEW.deposit_status := 'pending';
    NEW.deposit_paid_at := NULL;
  END IF;

  RETURN NEW;
END;
$sync_deposit$;

DROP TRIGGER IF EXISTS sync_trip_deposit_status_trigger ON public.trip_bookings;
CREATE TRIGGER sync_trip_deposit_status_trigger
  BEFORE INSERT OR UPDATE ON public.trip_bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_trip_deposit_status();

REVOKE EXECUTE ON FUNCTION public.sync_trip_deposit_status()
  FROM PUBLIC, anon, authenticated;

-- --------------------------------------------
-- 4. Public read: departures now carry their pickup points
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
  SELECT o.id, o.name, o.timezone, bs.deposit_instructions
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
           tr.currency,
           tr.requires_approval,
           tr.total_seats,
           tr.max_seats_per_booking,
           GREATEST(tr.total_seats - public.trip_seats_taken(tr.id), 0) AS seats_left,
           COALESCE((
             SELECT jsonb_agg(
                      jsonb_build_object(
                        'id', pp.id,
                        'name', pp.name,
                        'details', pp.details,
                        'pickup_time', pp.pickup_time,
                        'price_per_seat', pp.price_per_seat,
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
      'deposit_instructions', v_org.deposit_instructions
    ),
    'trips', v_trips
  );
END;
$trips_info$;

-- --------------------------------------------
-- 5. Booking: the chosen stop decides the price
-- --------------------------------------------

DROP FUNCTION IF EXISTS public.create_trip_booking(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]
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
  p_pickup_point_id UUID DEFAULT NULL
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

  -- When the departure has stops loaded, picking one is mandatory and it is
  -- what sets the price; otherwise the trip's own price applies.
  SELECT EXISTS (
    SELECT 1 FROM public.trip_pickup_points WHERE trip_id = p_trip_id
  ) INTO v_has_points;

  IF p_pickup_point_id IS NOT NULL THEN
    SELECT pp.price_per_seat, pp.deposit_per_seat
      INTO v_price_per_seat, v_deposit_per_seat
    FROM public.trip_pickup_points pp
    WHERE pp.id = p_pickup_point_id AND pp.trip_id = p_trip_id;

    IF v_price_per_seat IS NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'pickup_point_invalid');
    END IF;
  ELSIF v_has_points THEN
    RETURN jsonb_build_object('success', false, 'error', 'pickup_point_required');
  ELSE
    v_price_per_seat := v_trip.price_per_seat;
    v_deposit_per_seat := v_trip.deposit_per_seat;
  END IF;

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
    notes, pickup_point_id, amount_paid
  )
  VALUES (
    p_org_id, p_trip_id, v_customer_id, v_booking_number, p_seats, v_names,
    v_status, 'web', ROUND(v_price_per_seat * p_seats, 2), v_deposit_amount,
    v_deposit_status, v_hold_expires_at, NULLIF(btrim(COALESCE(p_notes, '')), ''),
    p_pickup_point_id, 0
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'booking_number', v_booking_number,
    'status', v_status,
    'seats', p_seats,
    'price_total', ROUND(v_price_per_seat * p_seats, 2),
    'deposit_amount', v_deposit_amount,
    'deposit_status', v_deposit_status,
    'hold_expires_at', v_hold_expires_at
  );
END;
$create_booking$;

REVOKE EXECUTE ON FUNCTION public.create_trip_booking(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_trip_booking(
  UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID
) TO service_role;
