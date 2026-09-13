-- ============================================
-- 047: WhatsApp on trip cancellations
-- ============================================
-- Same shape as 044: triggers only queue an http_post through queue_wa_trip,
-- which checks the WhatsApp integration and never blocks the write.

-- --------------------------------------------
-- A booking is cancelled
-- --------------------------------------------
-- Recreates the 044 function adding the third event. Approval and deposit
-- stay exactly as they were.

CREATE OR REPLACE FUNCTION public.trigger_wa_on_trip_booking_updated()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $wa_trip_updated$
BEGIN
  -- Approval: pending -> confirmed. Says nothing about the money.
  IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
    PERFORM public.queue_wa_trip(NEW.id, NEW.organization_id, 'trip_approved');
  END IF;

  -- Money: the deposit arrived. Says nothing about the approval.
  IF OLD.deposit_status IS DISTINCT FROM NEW.deposit_status
     AND NEW.deposit_status = 'paid' THEN
    PERFORM public.queue_wa_trip(NEW.id, NEW.organization_id, 'trip_deposit_paid');
  END IF;

  -- Cancellation of this booking.
  IF OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'cancelled' THEN
    PERFORM public.queue_wa_trip(NEW.id, NEW.organization_id, 'trip_booking_cancelled');
  END IF;

  RETURN NEW;
END;
$wa_trip_updated$;

-- --------------------------------------------
-- A whole departure is cancelled
-- --------------------------------------------
-- Cancelling a departure keeps its bookings as they are (TripService.cancel
-- only stamps cancelled_at), so every booking still alive gets the message.

CREATE OR REPLACE FUNCTION public.trigger_wa_on_trip_cancelled()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $wa_trip_cancelled$
DECLARE
  v_booking RECORD;
BEGIN
  IF OLD.cancelled_at IS NULL AND NEW.cancelled_at IS NOT NULL THEN
    FOR v_booking IN
      SELECT id, organization_id
      FROM public.trip_bookings
      WHERE trip_id = NEW.id
        AND status <> 'cancelled'
    LOOP
      PERFORM public.queue_wa_trip(
        v_booking.id,
        v_booking.organization_id,
        'trip_departure_cancelled'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$wa_trip_cancelled$;

DROP TRIGGER IF EXISTS trg_wa_on_trip_cancelled ON public.trips;
CREATE TRIGGER trg_wa_on_trip_cancelled
AFTER UPDATE OF cancelled_at ON public.trips
FOR EACH ROW EXECUTE FUNCTION public.trigger_wa_on_trip_cancelled();

-- Trigger functions are not an API (same fix as 034 and 045).
REVOKE EXECUTE ON FUNCTION public.trigger_wa_on_trip_booking_updated()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.trigger_wa_on_trip_cancelled()
  FROM PUBLIC, anon, authenticated;
