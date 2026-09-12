-- Notify the customer by WhatsApp when the business approves a pending
-- appointment (online bookings of services that require approval). The
-- "request received" message promises this confirmation.

ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'approved';

CREATE OR REPLACE FUNCTION public.trigger_wa_on_appointment_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_wa_enabled BOOLEAN;
  v_session_id TEXT;
  v_req_id BIGINT;
BEGIN
  -- Only the approval itself: pending -> confirmed
  IF OLD.status <> 'pending' OR NEW.status <> 'confirmed' THEN
    RETURN NEW;
  END IF;

  SELECT whatsapp_integration_enabled, openwa_session_id
    INTO v_wa_enabled, v_session_id
  FROM public.business_settings
  WHERE organization_id = NEW.organization_id;

  IF v_wa_enabled IS NOT TRUE OR v_session_id IS NULL OR v_session_id = '' THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_supabase_url
    FROM public.app_config WHERE key = 'SUPABASE_URL';
  SELECT value INTO v_service_key
    FROM public.app_config WHERE key = 'SUPABASE_SERVICE_ROLE_KEY';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'wa-approved: app_config is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY';
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/wa-send',
    body := jsonb_build_object(
      'appointmentId', NEW.id,
      'intent', 'approved'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  ) INTO v_req_id;

  RAISE NOTICE 'wa-approved: queued approved for appointment % (req=%)',
    NEW.id, v_req_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'wa-approved trigger failed for appointment %: % (SQLSTATE %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_wa_on_appointment_approved ON public.appointments;
CREATE TRIGGER trg_wa_on_appointment_approved
AFTER UPDATE OF status ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_wa_on_appointment_approved();

COMMENT ON FUNCTION public.trigger_wa_on_appointment_approved IS
  'Sends the approved intent to the customer when a pending appointment is confirmed by the business.';
