-- Migración: Suscripciones con RevenueCat (Google Play / App Store)
-- Ejecutar después de 020_enable_realtime.sql
--
-- Arquitectura (ver docs/PLAN-GOOGLE-PLAY.md §2):
-- - app_user_id de RevenueCat = organizations.id
-- - El webhook (Edge Function revenuecat-webhook) llama a apply_revenuecat_event(),
--   que audita el evento y actualiza license_end_date de la organización.
-- - El sistema de licencias existente (008) sigue siendo la única fuente que
--   consulta la app: check_license_status() no cambia.
--
-- Cambios:
-- 1. Campos de suscripción en organizations
-- 2. Tabla subscription_events (auditoría e idempotencia)
-- 3. Función apply_revenuecat_event()

-- ============================================
-- 1. Campos de suscripción en organizations
-- ============================================

ALTER TABLE public.organizations
ADD COLUMN subscription_platform TEXT,
ADD COLUMN subscription_product_id TEXT,
ADD COLUMN subscription_status TEXT,
ADD COLUMN subscription_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN public.organizations.subscription_platform IS 'Tienda de la suscripción activa: play_store | app_store (NULL si la licencia es manual)';
COMMENT ON COLUMN public.organizations.subscription_product_id IS 'Product ID de la suscripción en la tienda (ej: tf_pro)';
COMMENT ON COLUMN public.organizations.subscription_status IS 'Último estado conocido: active | cancelled | billing_issue | expired';
COMMENT ON COLUMN public.organizations.subscription_updated_at IS 'Última vez que un evento de RevenueCat actualizó esta organización';

-- ============================================
-- 2. Tabla de auditoría de eventos de RevenueCat
-- ============================================

CREATE TABLE public.subscription_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  -- ID del evento en RevenueCat: garantiza idempotencia ante reintentos del webhook
  event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  product_id TEXT,
  store TEXT,
  environment TEXT,
  expiration_at TIMESTAMPTZ,
  raw_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_events_org ON public.subscription_events(organization_id, created_at DESC);

COMMENT ON TABLE public.subscription_events IS 'Auditoría de eventos recibidos del webhook de RevenueCat. event_id único garantiza idempotencia.';

-- RLS: solo admins pueden leer (la Edge Function usa service role y la bypasea)
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view subscription events"
  ON public.subscription_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    )
  );

-- ============================================
-- 3. Función para aplicar un evento de RevenueCat
-- ============================================

CREATE OR REPLACE FUNCTION public.apply_revenuecat_event(
  p_organization_id UUID,
  p_event_id TEXT,
  p_event_type TEXT,
  p_product_id TEXT,
  p_store TEXT,
  p_environment TEXT,
  p_expiration_at TIMESTAMPTZ,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted BOOLEAN;
BEGIN
  -- Idempotencia: si el evento ya fue procesado, no hacer nada
  INSERT INTO public.subscription_events (
    organization_id, event_id, event_type, product_id, store, environment, expiration_at, raw_payload
  )
  VALUES (
    p_organization_id, p_event_id, p_event_type, p_product_id, p_store, p_environment, p_expiration_at, p_payload
  )
  ON CONFLICT (event_id) DO NOTHING
  RETURNING true INTO v_inserted;

  IF v_inserted IS NULL THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'reason', 'duplicate event');
  END IF;

  -- Eventos que extienden/activan la licencia
  IF p_event_type IN ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED') THEN
    UPDATE public.organizations
    SET
      license_start_date = COALESCE(license_start_date, now()),
      license_end_date = p_expiration_at,
      is_active = true,
      subscription_platform = p_store,
      subscription_product_id = p_product_id,
      subscription_status = 'active',
      subscription_updated_at = now()
    WHERE id = p_organization_id;

  -- Cancelación: el acceso continúa hasta license_end_date ya fijada
  ELSIF p_event_type = 'CANCELLATION' THEN
    UPDATE public.organizations
    SET subscription_status = 'cancelled', subscription_updated_at = now()
    WHERE id = p_organization_id;

  -- Expiración: la licencia termina en la fecha que indica RevenueCat
  ELSIF p_event_type = 'EXPIRATION' THEN
    UPDATE public.organizations
    SET
      license_end_date = COALESCE(p_expiration_at, now()),
      subscription_status = 'expired',
      subscription_updated_at = now()
    WHERE id = p_organization_id;

  -- Problema de cobro: no tocar la licencia (el grace period existente aplica)
  ELSIF p_event_type = 'BILLING_ISSUE' THEN
    UPDATE public.organizations
    SET subscription_status = 'billing_issue', subscription_updated_at = now()
    WHERE id = p_organization_id;

  ELSE
    -- Evento informativo (TEST, TRANSFER, NON_RENEWING_PURCHASE, etc.): solo se audita
    RETURN jsonb_build_object('success', true, 'audited_only', true, 'event_type', p_event_type);
  END IF;

  RETURN jsonb_build_object('success', true, 'event_type', p_event_type);
END;
$$;

COMMENT ON FUNCTION public.apply_revenuecat_event IS
'Aplica un evento del webhook de RevenueCat: lo audita en subscription_events (idempotente
por event_id) y actualiza la licencia de la organización según el tipo de evento.
Pensada para ser invocada SOLO por la Edge Function revenuecat-webhook (service role).';

-- Solo el service role puede ejecutarla (la Edge Function); nunca el cliente
REVOKE EXECUTE ON FUNCTION public.apply_revenuecat_event FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.apply_revenuecat_event FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_revenuecat_event FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_revenuecat_event TO service_role;
