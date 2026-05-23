-- Migración: arreglar el trigger de wa-send que usaba el schema equivocado de pg_net
--
-- Bug original (014): usé `extensions.http_post(...)` pero pg_net expone sus
-- funciones en el schema `net`, no `extensions`. La llamada fallaba con
-- "function does not exist", el EXCEPTION la tragaba, y por eso al crear
-- un appointment no se disparaba nada.
--
-- Fix:
--   1. Usar `net.http_post(...)` (la función real de pg_net en Supabase).
--   2. Capturar el request_id que devuelve pg_net y RAISE NOTICE para tener
--      visibilidad en los logs de Postgres.
--   3. Mantener el EXCEPTION para no romper el INSERT si algo falla,
--      pero ahora con RAISE WARNING que sí incluye el SQLERRM real.

DROP TRIGGER IF EXISTS trg_wa_send_on_appointment_insert ON public.appointments;
DROP FUNCTION IF EXISTS public.trigger_wa_send_on_appointment();

CREATE OR REPLACE FUNCTION public.trigger_wa_send_on_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_wa_enabled BOOLEAN;
  v_session_id TEXT;
  v_req_id BIGINT;
BEGIN
  -- ¿WhatsApp habilitado para esta org?
  SELECT whatsapp_integration_enabled, openwa_session_id
    INTO v_wa_enabled, v_session_id
  FROM public.business_settings
  WHERE organization_id = NEW.organization_id;

  IF v_wa_enabled IS NOT TRUE THEN
    RAISE NOTICE 'wa-send: skip appointment % (WA not enabled for org %)',
      NEW.id, NEW.organization_id;
    RETURN NEW;
  END IF;

  IF v_session_id IS NULL OR v_session_id = '' THEN
    RAISE NOTICE 'wa-send: skip appointment % (no openwa_session_id for org %)',
      NEW.id, NEW.organization_id;
    RETURN NEW;
  END IF;

  -- Credenciales para invocar Edge Function
  SELECT value INTO v_supabase_url
    FROM public.app_config WHERE key = 'SUPABASE_URL';
  SELECT value INTO v_service_key
    FROM public.app_config WHERE key = 'SUPABASE_SERVICE_ROLE_KEY';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'wa-send: app_config falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY';
    RETURN NEW;
  END IF;

  -- Confirmación al cliente
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/wa-send',
    body := jsonb_build_object(
      'appointmentId', NEW.id,
      'intent', 'confirm'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  ) INTO v_req_id;

  RAISE NOTICE 'wa-send: queued confirm for appointment % (req=%)',
    NEW.id, v_req_id;

  -- Notificación al negocio
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/wa-send',
    body := jsonb_build_object(
      'appointmentId', NEW.id,
      'intent', 'notify_business_new'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  ) INTO v_req_id;

  RAISE NOTICE 'wa-send: queued notify_business_new for appointment % (req=%)',
    NEW.id, v_req_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Loguear el SQLERRM real (antes era opaco)
    RAISE WARNING 'wa-send trigger failed for appointment %: % (SQLSTATE %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_wa_send_on_appointment_insert
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_wa_send_on_appointment();

COMMENT ON FUNCTION public.trigger_wa_send_on_appointment IS
  'Dispara WA confirmación + notif al negocio al crear appointment. Usa pg_net en schema `net`. Loguea NOTICE en éxito y WARNING en error.';
