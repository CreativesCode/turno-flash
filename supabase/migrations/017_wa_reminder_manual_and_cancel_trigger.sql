-- Migración:
--   1. Agregar el intent `reminder_manual` (recordatorio enviado a mano desde la app).
--   2. Trigger en UPDATE de appointments cuando el status pasa a `cancelled`:
--      avisa al cliente vía WhatsApp.

-- ============================================
-- 1. Nuevo valor en el enum
-- ============================================

ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'reminder_manual';

-- ============================================
-- 2. Trigger en UPDATE para notificar cancelación al cliente
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_wa_on_appointment_cancel()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_wa_enabled BOOLEAN;
  v_session_id TEXT;
  v_req_id BIGINT;
BEGIN
  -- Sólo si pasó a cancelled (y antes no estaba ya cancelled)
  IF NEW.status <> 'cancelled' OR OLD.status = 'cancelled' THEN
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
    RAISE WARNING 'wa-cancel: app_config falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY';
    RETURN NEW;
  END IF;

  -- Aviso al cliente (cancel_ack). El negocio normalmente es quien cancela
  -- desde la app, así que no le mandamos notify_business_cancel desde acá
  -- (eso lo hace wa-inbound cuando el cliente cancela por WhatsApp).
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/wa-send',
    body := jsonb_build_object(
      'appointmentId', NEW.id,
      'intent', 'cancel_ack'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  ) INTO v_req_id;

  RAISE NOTICE 'wa-cancel: queued cancel_ack for appointment % (req=%)',
    NEW.id, v_req_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'wa-cancel trigger failed for appointment %: % (SQLSTATE %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_wa_on_appointment_cancel ON public.appointments;
CREATE TRIGGER trg_wa_on_appointment_cancel
AFTER UPDATE OF status ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_wa_on_appointment_cancel();

COMMENT ON FUNCTION public.trigger_wa_on_appointment_cancel IS
  'Dispara cancel_ack al cliente cuando un appointment pasa a cancelled. No notifica al negocio (asumimos que es el negocio quien cancela desde la app).';
