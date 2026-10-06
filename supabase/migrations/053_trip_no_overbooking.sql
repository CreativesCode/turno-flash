-- ============================================
-- 053: No overbooking from the dashboard (QA plan P0-15)
-- ============================================
-- create_trip_booking (web) counts seats under an advisory lock per trip, but
-- the dashboard wrote straight to the tables: an owner could lower total_seats
-- below the seats sold, or load a phone booking on a full departure.
-- Both guards take the same lock as the RPC, so they also serialize with web
-- bookings. Errors carry a code prefix the app maps to a readable message.

CREATE OR REPLACE FUNCTION public.enforce_trip_capacity_not_below_taken()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_taken INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('trip_booking:' || NEW.id::TEXT, 0));
  v_taken := public.trip_seats_taken(NEW.id);
  IF NEW.total_seats < v_taken THEN
    RAISE EXCEPTION 'seats_below_taken:%', v_taken;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_trip_capacity_not_below_taken_trigger
  BEFORE UPDATE OF total_seats ON public.trips
  FOR EACH ROW
  WHEN (NEW.total_seats < OLD.total_seats)
  EXECUTE FUNCTION public.enforce_trip_capacity_not_below_taken();

CREATE OR REPLACE FUNCTION public.enforce_trip_booking_capacity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
  v_taken INTEGER;
BEGIN
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('trip_booking:' || NEW.trip_id::TEXT, 0));

  SELECT t.total_seats INTO v_total FROM public.trips t WHERE t.id = NEW.trip_id;
  v_taken := public.trip_seats_taken(NEW.trip_id);

  -- On UPDATE the row itself is already counted if it was live on this trip
  IF TG_OP = 'UPDATE' AND OLD.status <> 'cancelled' AND OLD.trip_id = NEW.trip_id THEN
    v_taken := v_taken - OLD.seats;
  END IF;

  IF v_taken + NEW.seats > v_total THEN
    RAISE EXCEPTION 'no_seats_left:%', GREATEST(v_total - v_taken, 0);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_trip_booking_capacity_trigger
  BEFORE INSERT OR UPDATE OF seats, status, trip_id ON public.trip_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_trip_booking_capacity();

REVOKE EXECUTE ON FUNCTION public.enforce_trip_capacity_not_below_taken() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_trip_booking_capacity() FROM PUBLIC, anon, authenticated;
