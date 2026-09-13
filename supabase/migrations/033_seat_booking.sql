-- ============================================
-- 033: Seat booking module (PRP-002)
-- ============================================
-- A module that lives NEXT TO the appointment engine, never inside it:
-- is_staff_slot_free, public_booking_slots and create_public_booking are not
-- touched. One trip = one concrete departure; one booking = N seats of it.
--
-- Two independent axes on a booking, by explicit product decision:
--   status         -> does the business accept this passenger? (approval)
--   deposit_status -> did the money arrive? (payment)
-- Neither moves the other, and the hold expiry looks at the DEPOSIT, not at
-- the approval: a confirmed booking that never paid expires just the same.
--
-- Capacity is COMPUTED (SUM of live bookings under an advisory lock), never a
-- denormalized counter that drifts on cancellations and expiries.

-- --------------------------------------------
-- 1. Enums
-- --------------------------------------------

-- Axis 1 - the seat: does the business accept this passenger?
DO $enum_status$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_booking_status') THEN
    CREATE TYPE public.trip_booking_status AS ENUM (
      'pending',    -- waiting for approval (only when trips.requires_approval)
      'confirmed',  -- accepted; says NOTHING about payment
      'cancelled',  -- by customer, business or expiry; frees the seats
      'completed',  -- travelled
      'no_show'     -- did not show up; does NOT free seats, the trip already left
    );
  END IF;
END $enum_status$;

-- Axis 2 - the money: did the deposit arrive? Moves on its own.
DO $enum_deposit$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'trip_deposit_status') THEN
    CREATE TYPE public.trip_deposit_status AS ENUM ('pending', 'paid', 'refunded', 'waived');
  END IF;
END $enum_deposit$;

-- --------------------------------------------
-- 2. Business modules (which product this org uses)
-- --------------------------------------------
-- Chosen at signup, changed afterwards ONLY by a platform admin.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS appointments_module_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS trips_module_enabled BOOLEAN NOT NULL DEFAULT false;

-- An organization with no module at all cannot operate.
DO $modules_check$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'organizations_at_least_one_module'
  ) THEN
    ALTER TABLE public.organizations
      ADD CONSTRAINT organizations_at_least_one_module
      CHECK (appointments_module_enabled OR trips_module_enabled);
  END IF;
END $modules_check$;

COMMENT ON COLUMN public.organizations.appointments_module_enabled IS
  'Appointment module. Set at signup, changed only by a platform admin.';
COMMENT ON COLUMN public.organizations.trips_module_enabled IS
  'Seat booking module. Set at signup, changed only by a platform admin.';

-- The UPDATE policy from migration 002 lets an OWNER update their own
-- organization, so without this an owner could switch a module on through the
-- API even though the UI never offers it. This trigger is the real barrier.
-- auth.uid() IS NULL means service_role / SQL editor / cron: left alone on
-- purpose, that is how signup and admin tooling write these columns.
CREATE OR REPLACE FUNCTION public.enforce_module_change_is_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $trg_modules$
BEGIN
  IF (NEW.appointments_module_enabled IS DISTINCT FROM OLD.appointments_module_enabled
      OR NEW.trips_module_enabled IS DISTINCT FROM OLD.trips_module_enabled)
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_profiles
       WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
     )
  THEN
    RAISE EXCEPTION 'Only a platform admin can change the organization modules';
  END IF;
  RETURN NEW;
END;
$trg_modules$;

DROP TRIGGER IF EXISTS trg_enforce_module_change ON public.organizations;
CREATE TRIGGER trg_enforce_module_change
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.enforce_module_change_is_admin();

-- --------------------------------------------
-- 3. Trips (one row = one concrete departure)
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  pickup_location TEXT,
  departure_date DATE NOT NULL,
  departure_time TIME NOT NULL,
  return_time TIME,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  total_seats INTEGER NOT NULL CHECK (total_seats > 0),
  max_seats_per_booking INTEGER NOT NULL DEFAULT 8 CHECK (max_seats_per_booking > 0),
  price_per_seat DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (price_per_seat >= 0),
  deposit_per_seat DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (deposit_per_seat >= 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  -- Same pattern as services.requires_approval (migration 010): the business
  -- decides per departure. true -> booking born 'pending'; false -> 'confirmed'.
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT true,
  cancelled_at TIMESTAMPTZ,
  internal_notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (deposit_per_seat <= price_per_seat OR price_per_seat = 0)
);

CREATE INDEX IF NOT EXISTS idx_trips_org_date
  ON public.trips(organization_id, departure_date);

-- --------------------------------------------
-- 4. Trip bookings (N seats of one departure)
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.trip_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_number TEXT,
  seats INTEGER NOT NULL CHECK (seats > 0),
  -- One name per seat for the driver list. Mandatory from the public page (the
  -- RPC enforces it), optional from the dashboard so a phone booking can be
  -- taken fast and completed later. Never more names than seats.
  passenger_names TEXT[] NOT NULL DEFAULT '{}',
  status public.trip_booking_status NOT NULL DEFAULT 'pending',
  source public.appointment_source NOT NULL DEFAULT 'admin',
  price_total DECIMAL(10,2),
  deposit_amount DECIMAL(10,2),
  deposit_status public.trip_deposit_status NOT NULL DEFAULT 'pending',
  deposit_paid_at TIMESTAMPTZ,
  deposit_method TEXT,
  hold_expires_at TIMESTAMPTZ,
  notes TEXT,
  internal_notes TEXT,
  cancellation_reason TEXT,
  cancelled_by UUID REFERENCES auth.users(id),
  cancelled_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (cardinality(passenger_names) <= seats)
);

-- Partial index: occupancy only ever sums live bookings.
CREATE INDEX IF NOT EXISTS idx_trip_bookings_live
  ON public.trip_bookings(trip_id) WHERE status <> 'cancelled';
CREATE INDEX IF NOT EXISTS idx_trip_bookings_customer
  ON public.trip_bookings(customer_id);
-- Used by the expiry cron.
CREATE INDEX IF NOT EXISTS idx_trip_bookings_expiring
  ON public.trip_bookings(hold_expires_at)
  WHERE deposit_status = 'pending' AND status <> 'cancelled';

DROP TRIGGER IF EXISTS update_trips_updated_at ON public.trips;
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_trip_bookings_updated_at ON public.trip_bookings;
CREATE TRIGGER update_trip_bookings_updated_at
  BEFORE UPDATE ON public.trip_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- --------------------------------------------
-- 5. Public page opt-in and deposit instructions
-- --------------------------------------------
-- NOT the module. This only says "is my public link open?", and it has any
-- effect only when organizations.trips_module_enabled is true.

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS seat_booking_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seat_booking_hold_hours INTEGER NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS deposit_instructions TEXT;

-- --------------------------------------------
-- 6. RLS (pattern of migration 027)
-- --------------------------------------------
-- Reads for any member of the org; writes only owner/admin AND a usable
-- license. No policy for anon: the public page goes through the edge function.

ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read trips of their org" ON public.trips;
CREATE POLICY "Members can read trips of their org"
ON public.trips FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can manage trips of their org" ON public.trips;
CREATE POLICY "Owners can manage trips of their org"
ON public.trips FOR ALL
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

DROP POLICY IF EXISTS "Members can read trip bookings of their org" ON public.trip_bookings;
CREATE POLICY "Members can read trip bookings of their org"
ON public.trip_bookings FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Owners can manage trip bookings of their org" ON public.trip_bookings;
CREATE POLICY "Owners can manage trip bookings of their org"
ON public.trip_bookings FOR ALL
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

-- --------------------------------------------
-- 7. Realtime for the dashboard lists (pattern of migration 020)
-- --------------------------------------------
-- Realtime respects RLS, so this only ever reaches signed-in members of the
-- org. The public page does NOT use it (it revalidates against the edge
-- function instead) and needs no anon policy.

ALTER TABLE public.trips REPLICA IDENTITY FULL;
ALTER TABLE public.trip_bookings REPLICA IDENTITY FULL;

DO $realtime$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['trips', 'trip_bookings'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $realtime$;

-- --------------------------------------------
-- 8. Helpers
-- --------------------------------------------

-- Seats already taken on a departure: everything that is not cancelled.
-- SECURITY INVOKER on purpose (same choice as save_staff_schedule in 031): the
-- dashboard calls it with the user's token and RLS keeps the count to their own
-- organization, while the SECURITY DEFINER functions below call it with the
-- definer's rights and see everything they need.
CREATE OR REPLACE FUNCTION public.trip_seats_taken(p_trip_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $seats_taken$
  SELECT COALESCE(SUM(b.seats), 0)::INTEGER
  FROM public.trip_bookings b
  WHERE b.trip_id = p_trip_id
    AND b.status <> 'cancelled';
$seats_taken$;

-- Booking number per organization, format V-0001. Callers hold the advisory
-- lock, same as generate_appointment_number does for appointments.
CREATE OR REPLACE FUNCTION public.generate_trip_booking_number(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $booking_number$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM '\d+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.trip_bookings
  WHERE organization_id = p_org_id;

  RETURN 'V-' || LPAD(next_number::TEXT, 4, '0');
END;
$booking_number$;

-- Is this organization taking seat bookings from the web right now?
-- Module on (admin decision) AND public page published (owner decision) AND
-- organization active AND license usable.
CREATE OR REPLACE FUNCTION public.public_trips_org_open(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $org_open$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    JOIN public.business_settings bs ON bs.organization_id = o.id
    WHERE o.id = p_org_id
      AND o.is_active
      AND o.trips_module_enabled IS TRUE
      AND bs.seat_booking_enabled IS TRUE
  )
  AND public.org_license_usable(p_org_id);
$org_open$;

-- --------------------------------------------
-- 9. Public read: business + upcoming departures with real free seats
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
           GREATEST(tr.total_seats - public.trip_seats_taken(tr.id), 0) AS seats_left
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
-- 10. Atomic booking: no overselling, ever
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.create_trip_booking(
  p_org_id UUID,
  p_trip_id UUID,
  p_seats INTEGER,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_notes TEXT,
  p_passenger_names TEXT[]
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
  v_deposit_amount DECIMAL(10,2);
  v_hold_expires_at TIMESTAMPTZ;
  v_names TEXT[];
  v_booking_id UUID;
  v_booking_number TEXT;
BEGIN
  -- Serialize per trip: the seat count and the V-000N number are both read
  -- and written inside this lock.
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

  -- One name per seat is mandatory from the web (the driver list is nominal).
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

  -- Recount inside the lock: this is what makes overselling impossible.
  v_seats_left := GREATEST(v_trip.total_seats - public.trip_seats_taken(p_trip_id), 0);
  IF v_seats_left < p_seats THEN
    RETURN jsonb_build_object('success', false, 'error', 'not_enough_seats',
                              'seats_left', v_seats_left);
  END IF;

  -- Anti-abuse: live future bookings of this phone in the organization.
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

  -- Reuse the customer by phone (most recent if duplicated); never overwrite.
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

  -- Axis 1: approval, exactly like create_public_booking does for services.
  v_status := CASE WHEN v_trip.requires_approval THEN 'pending' ELSE 'confirmed' END;

  -- Axis 2: the deposit, decided on its own and never touching the status.
  v_deposit_amount := ROUND(v_trip.deposit_per_seat * p_seats, 2);
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
    status, source, price_total, deposit_amount, deposit_status, hold_expires_at, notes
  )
  VALUES (
    p_org_id, p_trip_id, v_customer_id, v_booking_number, p_seats, v_names,
    v_status, 'web', ROUND(v_trip.price_per_seat * p_seats, 2), v_deposit_amount,
    v_deposit_status, v_hold_expires_at, NULLIF(btrim(COALESCE(p_notes, '')), '')
  )
  RETURNING id INTO v_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'booking_number', v_booking_number,
    'status', v_status,
    'seats', p_seats,
    'deposit_amount', v_deposit_amount,
    'deposit_status', v_deposit_status,
    'hold_expires_at', v_hold_expires_at
  );
END;
$create_booking$;

-- --------------------------------------------
-- 11. Expiry of unpaid holds (cron, phase 5)
-- --------------------------------------------
-- Looks at the DEPOSIT, not at the approval: a confirmed booking that never
-- paid expires too. Paid and waived are never touched.

CREATE OR REPLACE FUNCTION public.release_expired_trip_holds()
RETURNS INTEGER
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $release_holds$
DECLARE
  v_count INTEGER;
BEGIN
  WITH expired AS (
    UPDATE public.trip_bookings b
    SET status = 'cancelled',
        cancelled_at = now(),
        cancellation_reason = 'deposit_expired'
    WHERE b.deposit_status = 'pending'
      AND b.status IN ('pending', 'confirmed')
      AND b.hold_expires_at IS NOT NULL
      AND b.hold_expires_at < now()
    RETURNING 1
  )
  SELECT count(*)::INTEGER INTO v_count FROM expired;

  RETURN v_count;
END;
$release_holds$;

-- --------------------------------------------
-- 12. Grants: the edge function (service_role) and nobody else
-- --------------------------------------------

REVOKE EXECUTE ON FUNCTION public.trip_seats_taken(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_trip_booking_number(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.public_trips_org_open(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.public_trips_info(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_trip_booking(UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_expired_trip_holds() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.public_trips_info(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_trip_booking(UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_expired_trip_holds() TO service_role;

-- The dashboard reads occupancy with the user's own token.
GRANT EXECUTE ON FUNCTION public.trip_seats_taken(UUID) TO authenticated;

-- --------------------------------------------
-- 13. How signup sets the modules (no change here, on purpose)
-- --------------------------------------------
-- create_organization_with_owner (migration 026) is NOT touched. Adding a
-- parameter would mean either an overloaded signature (ambiguous calls with
-- the old 8 arguments) or copying its ~130 lines into this file, where the two
-- copies would drift apart.
--
-- Instead the self-signup edge function, which already runs as service_role
-- and already calls that RPC, updates the two columns right after creating the
-- organization (phase 6). The trigger above lets it through because
-- auth.uid() is NULL for service_role.
--
-- Defaults keep every existing organization exactly as it is today:
-- appointments on, trips off.
