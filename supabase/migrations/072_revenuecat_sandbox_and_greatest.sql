-- P3-20: two fixes to how store subscription events touch the license.
-- 1. Sandbox (test) purchases extended the real license of the business: they
--    are now stored for audit only.
-- 2. A purchase or renewal overwrote license_end_date, so it could shorten a
--    license an admin had extended by hand (how licenses are paid in Cuba).
--    It now keeps whichever date is later. GREATEST ignores NULL, so a first
--    purchase still sets the date.
-- Live definition with only those two changes.
CREATE OR REPLACE FUNCTION public.apply_revenuecat_event(p_organization_id uuid, p_event_id text, p_event_type text, p_product_id text, p_store text, p_environment text, p_expiration_at timestamp with time zone, p_payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  -- Compras de prueba (sandbox): se auditan, pero no tocan la licencia real
  IF upper(COALESCE(p_environment, '')) = 'SANDBOX' THEN
    RETURN jsonb_build_object('success', true, 'audited_only', true, 'reason', 'sandbox');
  END IF;

  -- Eventos que extienden/activan la licencia
  IF p_event_type IN ('INITIAL_PURCHASE', 'RENEWAL', 'UNCANCELLATION', 'PRODUCT_CHANGE', 'SUBSCRIPTION_EXTENDED') THEN
    UPDATE public.organizations
    SET
      license_start_date = COALESCE(license_start_date, now()),
      -- Nunca acorta una licencia que un admin extendió a mano más allá
      license_end_date = GREATEST(license_end_date, p_expiration_at),
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
$function$;
