-- ============================================
-- 039: Driver details, booking window, and currency per organization
-- ============================================
-- Three things the real-world examples asked for:
--
-- 1. The business sends the driver's name, phone and the vehicle the day
--    before the trip. All optional: many departures are sold before the driver
--    is assigned.
-- 2. Reservations open on a date and time ("the Thursday before, from 4 PM")
--    and can close early. Both optional; empty means always open.
-- 3. Each organization charges in one currency, so it stops being a per-trip
--    field that every form has to ask about.

-- --------------------------------------------
-- 1. Driver and vehicle, per departure
-- --------------------------------------------

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS driver_name TEXT,
  ADD COLUMN IF NOT EXISTS driver_phone TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_description TEXT;

COMMENT ON COLUMN public.trips.vehicle_description IS
  'Bus/plate as the passenger will recognise it, e.g. "Omnibus 2079, Toyota Coaster".';

-- --------------------------------------------
-- 2. Booking window, per departure
-- --------------------------------------------

ALTER TABLE public.trips
  ADD COLUMN IF NOT EXISTS booking_opens_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS booking_closes_at TIMESTAMPTZ;

COMMENT ON COLUMN public.trips.booking_opens_at IS
  'Public page refuses bookings before this instant. NULL = open as soon as published.';
COMMENT ON COLUMN public.trips.booking_closes_at IS
  'Public page refuses bookings after this instant. NULL = open until departure.';

-- --------------------------------------------
-- 3. Currency per organization
-- --------------------------------------------

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

COMMENT ON COLUMN public.organizations.currency IS
  'ISO code the business charges in. Trips and services inherit it.';

-- Keep what each organization was already using in its services, so nothing
-- changes on screen for the businesses that are running today.
UPDATE public.organizations o
SET currency = sub.currency
FROM (
  SELECT s.organization_id, s.currency, count(*) AS uses
  FROM public.services s
  WHERE s.currency IS NOT NULL AND s.currency <> ''
  GROUP BY s.organization_id, s.currency
  ORDER BY s.organization_id, uses DESC
) sub
WHERE sub.organization_id = o.id
  AND o.currency = 'USD'
  AND sub.currency <> 'USD';

-- --------------------------------------------
-- 4. The public page has to respect the window
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
           tr.currency,
           tr.requires_approval,
           tr.total_seats,
           tr.max_seats_per_booking,
           tr.driver_name,
           tr.driver_phone,
           tr.vehicle_description,
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

-- The booking itself enforces the window: listing it is not permission to book.
CREATE OR REPLACE FUNCTION public.trip_booking_window_open(p_trip_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $window_open$
  SELECT COALESCE(
    (booking_opens_at IS NULL OR booking_opens_at <= now())
      AND (booking_closes_at IS NULL OR booking_closes_at > now()),
    true
  )
  FROM public.trips
  WHERE id = p_trip_id;
$window_open$;

REVOKE EXECUTE ON FUNCTION public.trip_booking_window_open(UUID)
  FROM PUBLIC, anon, authenticated;

-- Enforced with a trigger rather than by rewriting create_trip_booking: the
-- rule then holds for every path into the table, and the ~200 line function
-- does not get copied into yet another migration to change two lines.
-- Only web bookings are gated: the business can always take a booking by
-- phone outside the window.
CREATE OR REPLACE FUNCTION public.enforce_trip_booking_window()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $enforce_window$
BEGIN
  IF NEW.source = 'web' AND NOT public.trip_booking_window_open(NEW.trip_id) THEN
    RAISE EXCEPTION 'booking_window_closed'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$enforce_window$;

DROP TRIGGER IF EXISTS enforce_trip_booking_window_trigger ON public.trip_bookings;
CREATE TRIGGER enforce_trip_booking_window_trigger
  BEFORE INSERT ON public.trip_bookings
  FOR EACH ROW EXECUTE FUNCTION public.enforce_trip_booking_window();

REVOKE EXECUTE ON FUNCTION public.enforce_trip_booking_window()
  FROM PUBLIC, anon, authenticated;
