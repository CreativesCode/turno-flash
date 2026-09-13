-- ============================================
-- 044: WhatsApp triggers of the seat booking module
-- ============================================
-- Same shape as trigger_wa_on_appointment_approved (032): the trigger only
-- fires an http_post at an edge function and never blocks the booking — a
-- WhatsApp that fails must not lose a passenger.
--
-- wa-send is NOT touched: trips have their own function, wa-trip-send.

CREATE OR REPLACE FUNCTION public.queue_wa_trip(
  p_booking_id UUID,
  p_org_id UUID,
  p_intent TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $queue_wa_trip$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_wa_enabled BOOLEAN;
  v_session_id TEXT;
  v_req_id BIGINT;
BEGIN
  SELECT whatsapp_integration_enabled, openwa_session_id
    INTO v_wa_enabled, v_session_id
  FROM public.business_settings
  WHERE organization_id = p_org_id;

  IF v_wa_enabled IS NOT TRUE OR v_session_id IS NULL OR v_session_id = '' THEN
    RETURN;
  END IF;

  SELECT value INTO v_supabase_url FROM public.app_config WHERE key = 'SUPABASE_URL';
  SELECT value INTO v_service_key FROM public.app_config WHERE key = 'SUPABASE_SERVICE_ROLE_KEY';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'wa-trip: app_config is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY';
    RETURN;
  END IF;

  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/wa-trip-send',
    body := jsonb_build_object('bookingId', p_booking_id, 'intent', p_intent),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  ) INTO v_req_id;

  RAISE NOTICE 'wa-trip: queued % for booking % (req=%)', p_intent, p_booking_id, v_req_id;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'wa-trip queue failed for booking %: % (SQLSTATE %)',
      p_booking_id, SQLERRM, SQLSTATE;
END;
$queue_wa_trip$;

REVOKE EXECUTE ON FUNCTION public.queue_wa_trip(UUID, UUID, TEXT)
  FROM PUBLIC, anon, authenticated;

-- --------------------------------------------
-- New booking: the passenger gets the details, the business gets the heads-up
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.trigger_wa_on_trip_booking_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $wa_trip_created$
BEGIN
  PERFORM public.queue_wa_trip(NEW.id, NEW.organization_id, 'trip_booked');
  -- Only for bookings the business did not take itself.
  IF NEW.source = 'web' THEN
    PERFORM public.queue_wa_trip(NEW.id, NEW.organization_id, 'trip_notify_business');
  END IF;
  RETURN NEW;
END;
$wa_trip_created$;

DROP TRIGGER IF EXISTS trg_wa_on_trip_booking_created ON public.trip_bookings;
CREATE TRIGGER trg_wa_on_trip_booking_created
AFTER INSERT ON public.trip_bookings
FOR EACH ROW EXECUTE FUNCTION public.trigger_wa_on_trip_booking_created();

-- --------------------------------------------
-- The two axes, each with its own message
-- --------------------------------------------

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

  RETURN NEW;
END;
$wa_trip_updated$;

DROP TRIGGER IF EXISTS trg_wa_on_trip_booking_updated ON public.trip_bookings;
CREATE TRIGGER trg_wa_on_trip_booking_updated
AFTER UPDATE ON public.trip_bookings
FOR EACH ROW EXECUTE FUNCTION public.trigger_wa_on_trip_booking_updated();

COMMENT ON FUNCTION public.trigger_wa_on_trip_booking_updated IS
  'Approval and deposit are independent events: each one sends its own message.';
