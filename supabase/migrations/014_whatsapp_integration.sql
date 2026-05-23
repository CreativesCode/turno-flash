-- Migración: Integración WhatsApp vía OpenWA
-- Casos cubiertos:
--   1. Confirmación al crear un appointment
--   2. Recordatorios T-24h y T-1h (vía send-reminders + pg_cron)
--   3. Parser de respuestas (CANCELAR / OK) — implementado en Edge Function wa-inbound
--   4. Notificación al negocio en eventos relevantes

-- ============================================
-- 1. EXTENSIONES
-- ============================================

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ============================================
-- 2. CONFIGURACIÓN DE APP (para que triggers DB puedan invocar Edge Functions)
-- ============================================

CREATE TABLE IF NOT EXISTS public.app_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can read app_config"
ON public.app_config FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Only admins can manage app_config"
ON public.app_config FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

COMMENT ON TABLE public.app_config IS 'Configuración runtime usada por triggers DB. Poblar manualmente con SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY tras desplegar.';

-- ============================================
-- 3. AJUSTES A TABLAS EXISTENTES
-- ============================================

-- Cada negocio tiene su propia sesión OpenWA (un número de WhatsApp dedicado).
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS openwa_session_id TEXT;

COMMENT ON COLUMN public.business_settings.openwa_session_id IS 'ID de la sesión OpenWA asociada al número de WhatsApp del negocio (ej: sess_abc123).';

-- ============================================
-- 4. NUEVOS ENUMS
-- ============================================

DO $$ BEGIN
  CREATE TYPE wa_outbound_intent AS ENUM (
    'confirm',
    'reminder_24h',
    'reminder_1h',
    'notify_business_new',
    'notify_business_cancel',
    'notify_business_confirm',
    'cancel_ack',
    'confirm_ack'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE wa_outbound_status AS ENUM (
    'pending',
    'sent',
    'delivered',
    'read',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 5. TABLA: wa_outbound_messages
-- ============================================

CREATE TABLE public.wa_outbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  intent wa_outbound_intent NOT NULL,
  chat_id TEXT NOT NULL,
  message_id TEXT UNIQUE,              -- el que devuelve OpenWA tras enviar
  status wa_outbound_status NOT NULL DEFAULT 'pending',
  body TEXT,
  error_code TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ DEFAULT now(),
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_wa_outbound_org ON public.wa_outbound_messages(organization_id);
CREATE INDEX idx_wa_outbound_appointment ON public.wa_outbound_messages(appointment_id);
CREATE INDEX idx_wa_outbound_chat ON public.wa_outbound_messages(chat_id);
CREATE INDEX idx_wa_outbound_intent_sent ON public.wa_outbound_messages(appointment_id, intent, sent_at DESC);

COMMENT ON TABLE public.wa_outbound_messages IS 'Registro de mensajes WhatsApp salientes a través de OpenWA.';

ALTER TABLE public.wa_outbound_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view wa outbound of their org"
ON public.wa_outbound_messages FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
);

-- ============================================
-- 6. TABLA: wa_processed_events (idempotencia)
-- ============================================

CREATE TABLE public.wa_processed_events (
  idempotency_key TEXT PRIMARY KEY,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  event_type TEXT,
  processed_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_wa_processed_at ON public.wa_processed_events(processed_at);

COMMENT ON TABLE public.wa_processed_events IS 'Idempotencia de webhooks OpenWA. Limpiar entradas > 24h vía cron.';

ALTER TABLE public.wa_processed_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 7. TRIGGER: invocar wa-send en INSERT de appointment (Caso 1)
-- ============================================

CREATE OR REPLACE FUNCTION public.trigger_wa_send_on_appointment()
RETURNS TRIGGER AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_wa_enabled BOOLEAN;
  v_intent TEXT;
BEGIN
  -- Solo si la organización tiene WhatsApp habilitado y sesión configurada
  SELECT whatsapp_integration_enabled
    INTO v_wa_enabled
  FROM public.business_settings
  WHERE organization_id = NEW.organization_id;

  IF v_wa_enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  -- Cargar credenciales para llamar la Edge Function
  SELECT value INTO v_supabase_url FROM public.app_config WHERE key = 'SUPABASE_URL';
  SELECT value INTO v_service_key FROM public.app_config WHERE key = 'SUPABASE_SERVICE_ROLE_KEY';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    -- Sin config, no hacemos nada (no rompemos el insert)
    RETURN NEW;
  END IF;

  -- Determinar intent
  IF TG_OP = 'INSERT' THEN
    v_intent := 'confirm';
  ELSE
    RETURN NEW;
  END IF;

  -- Llamar Edge Function async (no bloquea el INSERT)
  PERFORM extensions.http_post(
    url := v_supabase_url || '/functions/v1/wa-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'appointmentId', NEW.id,
      'intent', v_intent
    )
  );

  -- También notificar al negocio
  PERFORM extensions.http_post(
    url := v_supabase_url || '/functions/v1/wa-send',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    ),
    body := jsonb_build_object(
      'appointmentId', NEW.id,
      'intent', 'notify_business_new'
    )
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Nunca romper el flujo principal por un fallo de comunicación
    RAISE WARNING 'wa-send trigger failed for appointment %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_wa_send_on_appointment_insert
AFTER INSERT ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_wa_send_on_appointment();

COMMENT ON FUNCTION public.trigger_wa_send_on_appointment IS 'Dispara confirmación WA + notificación al negocio al crear un appointment. Idempotente: si falla, no rompe el INSERT.';

-- ============================================
-- 8. CLEANUP JOB para wa_processed_events
-- ============================================

-- Función para limpiar eventos procesados > 24h
CREATE OR REPLACE FUNCTION public.cleanup_wa_processed_events()
RETURNS void
LANGUAGE sql
AS $$
  DELETE FROM public.wa_processed_events
  WHERE processed_at < now() - INTERVAL '24 hours';
$$;

COMMENT ON FUNCTION public.cleanup_wa_processed_events IS 'Borra entradas de idempotencia > 24h. Llamar desde pg_cron diariamente.';

-- ============================================
-- 9. RPC: appointments dentro de ventana temporal (para send-reminders)
-- ============================================

CREATE OR REPLACE FUNCTION public.wa_appointments_in_window(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  appointment_date DATE,
  start_time TIME,
  status appointment_status,
  reminder_sent_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    a.id,
    a.organization_id,
    a.appointment_date,
    a.start_time,
    a.status,
    a.reminder_sent_at
  FROM public.appointments a
  WHERE
    a.reminder_sent_at IS NULL
    AND a.status IN ('confirmed', 'pending', 'client_confirmed')
    AND (a.appointment_date + a.start_time)::TIMESTAMPTZ BETWEEN p_start AND p_end;
$$;

COMMENT ON FUNCTION public.wa_appointments_in_window IS 'Devuelve appointments cuyo datetime cae en una ventana, sin recordatorio enviado todavía.';
