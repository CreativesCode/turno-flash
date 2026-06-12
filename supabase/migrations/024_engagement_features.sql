-- Migración: Funcionalidades de engagement por WhatsApp (Fase 2 del plan)
-- Ejecutar después de 023_fix_license_view_subscription_columns.sql
--
-- Ver docs/PLAN-DASHBOARDS-Y-MEJORAS.md (Fase 2):
--   2.1 Resumen diario al dueño (edge function daily-summary + cron)
--   2.2 Solicitud de valoración al completar un turno (trigger → wa-send)
--   2.3 Reactivación de clientes dormidos (edge function wa-campaign)
--   2.4 Notificar a la lista de espera cuando se cancela un turno (trigger → wa-send)

-- ============================================
-- 1. Nuevos intents de mensajes salientes
-- ============================================

ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'daily_summary';
ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'rating_request';
ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'rating_ack';
ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'reactivation';
ALTER TYPE wa_outbound_intent ADD VALUE IF NOT EXISTS 'waitlist_slot';

-- ============================================
-- 2. Configuración por negocio
-- ============================================

ALTER TABLE public.business_settings
ADD COLUMN IF NOT EXISTS enable_daily_summary BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS daily_summary_time TIME DEFAULT '07:00',
ADD COLUMN IF NOT EXISTS enable_rating_request BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.business_settings.enable_daily_summary IS
'Si true, la edge function daily-summary envía cada mañana un resumen del día al whatsapp_phone de la organización.';
COMMENT ON COLUMN public.business_settings.daily_summary_time IS
'Hora local (timezone de la organización) a la que se envía el resumen diario.';
COMMENT ON COLUMN public.business_settings.enable_rating_request IS
'Si true, al completar un turno se pide una valoración (1-5) al cliente por WhatsApp.';

-- Throttle de reactivación: máx. 1 mensaje cada 30 días por cliente
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS last_reactivation_sent_at TIMESTAMPTZ;

COMMENT ON COLUMN public.customers.last_reactivation_sent_at IS
'Último mensaje de reactivación enviado (campaña "recuperar clientes"). Máx. 1 cada 30 días.';

-- ============================================
-- 3. Trigger: turno completado → pedir valoración
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_wa_on_appointment_completed()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_wa_enabled BOOLEAN;
  v_session_id TEXT;
  v_rating_enabled BOOLEAN;
  v_req_id BIGINT;
BEGIN
  -- Sólo si pasó a completed (y antes no lo estaba) y aún no tiene rating
  IF NEW.status <> 'completed' OR OLD.status = 'completed' OR NEW.rating IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT whatsapp_integration_enabled, openwa_session_id, enable_rating_request
    INTO v_wa_enabled, v_session_id, v_rating_enabled
  FROM public.business_settings
  WHERE organization_id = NEW.organization_id;

  IF v_wa_enabled IS NOT TRUE
     OR v_rating_enabled IS NOT TRUE
     OR v_session_id IS NULL OR v_session_id = '' THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_supabase_url
    FROM public.app_config WHERE key = 'SUPABASE_URL';
  SELECT value INTO v_service_key
    FROM public.app_config WHERE key = 'SUPABASE_SERVICE_ROLE_KEY';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'wa-rating: app_config falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY';
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/wa-send',
    body := jsonb_build_object(
      'appointmentId', NEW.id,
      'intent', 'rating_request'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  ) INTO v_req_id;

  RAISE NOTICE 'wa-rating: queued rating_request for appointment % (req=%)',
    NEW.id, v_req_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'wa-rating trigger failed for appointment %: % (SQLSTATE %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_wa_on_appointment_completed ON public.appointments;
CREATE TRIGGER trg_wa_on_appointment_completed
AFTER UPDATE OF status ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_wa_on_appointment_completed();

COMMENT ON FUNCTION public.trigger_wa_on_appointment_completed IS
'Cuando un turno pasa a completed, pide al cliente una valoración 1-5 por WhatsApp
(intent rating_request). wa-inbound parsea la respuesta numérica y guarda appointments.rating.';

-- ============================================
-- 4. Trigger: turno cancelado → avisar a la lista de espera
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_waitlist_on_appointment_cancel()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_wa_enabled BOOLEAN;
  v_session_id TEXT;
  v_waitlist_id UUID;
  v_req_id BIGINT;
BEGIN
  IF NEW.status <> 'cancelled' OR OLD.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Sólo tiene sentido para huecos futuros
  IF NEW.appointment_date < CURRENT_DATE THEN
    RETURN NEW;
  END IF;

  SELECT whatsapp_integration_enabled, openwa_session_id
    INTO v_wa_enabled, v_session_id
  FROM public.business_settings
  WHERE organization_id = NEW.organization_id;

  IF v_wa_enabled IS NOT TRUE OR v_session_id IS NULL OR v_session_id = '' THEN
    RETURN NEW;
  END IF;

  -- Primer candidato compatible: mismo servicio, fecha exacta o flexible,
  -- staff compatible, aún activo y sin expirar.
  SELECT w.id INTO v_waitlist_id
  FROM public.waitlist w
  WHERE w.organization_id = NEW.organization_id
    AND w.service_id = NEW.service_id
    AND w.status = 'active'
    AND (w.expires_at IS NULL OR w.expires_at > now())
    AND (w.flexible_dates OR w.preferred_date = NEW.appointment_date)
    AND (
      w.preferred_staff_id IS NULL
      OR NEW.staff_id IS NULL
      OR w.preferred_staff_id = NEW.staff_id
    )
  ORDER BY w.priority DESC, w.created_at ASC
  LIMIT 1;

  IF v_waitlist_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_supabase_url
    FROM public.app_config WHERE key = 'SUPABASE_URL';
  SELECT value INTO v_service_key
    FROM public.app_config WHERE key = 'SUPABASE_SERVICE_ROLE_KEY';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'waitlist: app_config falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY';
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/wa-send',
    body := jsonb_build_object(
      'appointmentId', NEW.id,
      'intent', 'waitlist_slot',
      'waitlistId', v_waitlist_id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  ) INTO v_req_id;

  RAISE NOTICE 'waitlist: queued waitlist_slot for appointment % → waitlist % (req=%)',
    NEW.id, v_waitlist_id, v_req_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'waitlist trigger failed for appointment %: % (SQLSTATE %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_waitlist_on_appointment_cancel ON public.appointments;
CREATE TRIGGER trg_waitlist_on_appointment_cancel
AFTER UPDATE OF status ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_waitlist_on_appointment_cancel();

COMMENT ON FUNCTION public.trigger_waitlist_on_appointment_cancel IS
'Cuando se cancela un turno futuro, busca el primer candidato compatible en la
lista de espera y le avisa por WhatsApp (intent waitlist_slot vía wa-send).
wa-send marca la entrada como notified al enviar.';

-- ============================================
-- 5. Cron del resumen diario (cada 15 min; la función decide a quién toca)
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'wa-daily-summary',
      '*/15 * * * *',
      $cron$
      SELECT net.http_post(
        url := (SELECT value FROM public.app_config WHERE key = 'SUPABASE_URL') || '/functions/v1/daily-summary',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || (SELECT value FROM public.app_config WHERE key = 'SUPABASE_SERVICE_ROLE_KEY')
        )
      );
      $cron$
    );
    RAISE NOTICE 'cron wa-daily-summary programado (*/15)';
  ELSE
    RAISE NOTICE 'pg_cron no está habilitado: programar daily-summary manualmente (mismo patrón que send-reminders)';
  END IF;
END $$;
