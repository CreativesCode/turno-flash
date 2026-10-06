-- P1-03 + D-05: rescheduling an appointment.
-- Moving an open appointment to another date or time asks the customer to
-- confirm again (status back to confirmed), clears the reminder and the
-- customer's confirmation so both happen again for the new time, and sends
-- the WhatsApp intent "rescheduled". rescheduled_at lets wa-send ignore
-- reminders sent for the old time.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS rescheduled_at timestamptz;

CREATE OR REPLACE FUNCTION public.appointment_reschedule_reset()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.appointment_date = OLD.appointment_date
     AND NEW.start_time = OLD.start_time THEN
    RETURN NEW;
  END IF;
  IF OLD.status NOT IN ('pending', 'confirmed', 'reminded', 'client_confirmed') THEN
    RETURN NEW;
  END IF;

  NEW.rescheduled_at := now();
  NEW.reminder_sent_at := NULL;
  NEW.client_confirmed_at := NULL;
  IF OLD.status IN ('reminded', 'client_confirmed') THEN
    NEW.status := 'confirmed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_appointment_reschedule_reset ON public.appointments;
CREATE TRIGGER trg_appointment_reschedule_reset
  BEFORE UPDATE OF appointment_date, start_time ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.appointment_reschedule_reset();

-- Same shape as trigger_wa_on_appointment_approved (032)
CREATE OR REPLACE FUNCTION public.trigger_wa_on_appointment_rescheduled()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_wa_enabled BOOLEAN;
  v_session_id TEXT;
  v_req_id BIGINT;
BEGIN
  IF NEW.rescheduled_at IS NOT DISTINCT FROM OLD.rescheduled_at THEN
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
    RAISE WARNING 'wa-rescheduled: app_config is missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY';
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/wa-send',
    body := jsonb_build_object(
      'appointmentId', NEW.id,
      'intent', 'rescheduled'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  ) INTO v_req_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'wa-rescheduled trigger failed for appointment %: % (SQLSTATE %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_on_appointment_rescheduled ON public.appointments;
CREATE TRIGGER trg_wa_on_appointment_rescheduled
  -- Column lists ignore changes made by BEFORE triggers, so listen to the
  -- moved columns and compare rescheduled_at inside the function.
  AFTER UPDATE OF appointment_date, start_time ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_wa_on_appointment_rescheduled();
