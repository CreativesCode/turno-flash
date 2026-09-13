-- ============================================
-- 036: Assign booking_number to every trip booking
-- ============================================
-- 033 numbers the bookings that come from create_trip_booking (the public
-- page), but a booking taken by the business from the dashboard is a plain
-- INSERT and was left without a number.
--
-- Same solution the appointment engine already uses (set_appointment_number,
-- migration 010): a BEFORE INSERT trigger fills it in when it is missing, so
-- the rule lives in one place no matter who writes the row.

CREATE OR REPLACE FUNCTION public.set_trip_booking_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $set_number$
BEGIN
  IF NEW.booking_number IS NULL THEN
    NEW.booking_number := public.generate_trip_booking_number(NEW.organization_id);
  END IF;
  RETURN NEW;
END;
$set_number$;

DROP TRIGGER IF EXISTS set_trip_booking_number_trigger ON public.trip_bookings;
CREATE TRIGGER set_trip_booking_number_trigger
  BEFORE INSERT ON public.trip_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_trip_booking_number();

-- Trigger function: never reachable as an RPC (advisor 033/034 lesson).
REVOKE EXECUTE ON FUNCTION public.set_trip_booking_number()
  FROM PUBLIC, anon, authenticated;
