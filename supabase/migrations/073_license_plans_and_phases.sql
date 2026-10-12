-- PRP-003 phase 1: license plans, phases and payment ledger.
--
-- Until now a license was two loose dates on the organization: the database
-- could not tell a trial from a paid period, nor what each business pays.
-- This adds the plan, the phase (pending / trial / paid), the founder price,
-- the referrer and the owner's WhatsApp to the organization, a ledger of
-- payments, and a single source for the grace period (5 days, was 7).
--
-- license_start_date / license_end_date stay the only source of the expiry
-- date: more than 50 call sites read them.

-- ---------------------------------------------------------------------------
-- 1. Grace period: one source of truth
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.license_grace_days()
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$ SELECT 5 $$;

COMMENT ON FUNCTION public.license_grace_days() IS
  'Days a business keeps working after its license ends. Mirrored by LICENSE_GRACE_DAYS in config/license-pricing.ts.';

-- ---------------------------------------------------------------------------
-- 2. Plan, phase and billing data on the organization
-- ---------------------------------------------------------------------------
ALTER TABLE public.organizations
  ADD COLUMN license_plan TEXT NOT NULL DEFAULT 'personal'
    CHECK (license_plan IN ('personal', 'salon', 'salon_large', 'trips')),
  -- New organizations start "pending" (blocked until the first payment)
  -- unless they are created with a trial; see guard_organization_license().
  ADD COLUMN license_phase TEXT NOT NULL DEFAULT 'pending'
    CHECK (license_phase IN ('pending', 'trial', 'paid')),
  ADD COLUMN billing_period TEXT
    CHECK (billing_period IN ('monthly', 'quarterly', 'semiannual', 'annual')),
  ADD COLUMN license_founder BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN founder_price_until DATE,
  ADD COLUMN referred_by_organization_id UUID
    REFERENCES public.organizations(id) ON DELETE SET NULL,
  ADD COLUMN referral_credit_applied_at TIMESTAMPTZ,
  ADD COLUMN owner_phone TEXT,
  ADD CONSTRAINT organizations_not_self_referred
    CHECK (referred_by_organization_id IS DISTINCT FROM id);

COMMENT ON COLUMN public.organizations.license_founder IS
  'Marked by the platform admin before the first payment; the 24-month price lock starts at that payment.';
COMMENT ON COLUMN public.organizations.founder_price_until IS
  'Last day the founder price applies. Set by the first payment of a founder business.';
COMMENT ON COLUMN public.organizations.owner_phone IS
  'WhatsApp number of the owner; license notices are sent here.';

-- ---------------------------------------------------------------------------
-- 3. Existing businesses (decision A-6): they are all test data. Each gets the
--    plan that matches its size and a fresh 15-day trial; none is a founder.
--    Businesses without dates keep their unlimited access (decision A-7) and
--    long licenses (the demo account) are not shortened.
-- ---------------------------------------------------------------------------
UPDATE public.organizations o
SET
  license_phase = 'trial',
  license_plan = CASE
    WHEN NOT o.appointments_module_enabled THEN 'trips'
    WHEN s.active_staff > 5 THEN 'salon_large'
    WHEN s.active_staff > 1 THEN 'salon'
    ELSE 'personal'
  END
FROM (
  SELECT org.id,
         (SELECT COUNT(*) FROM public.staff_members sm
          WHERE sm.organization_id = org.id AND sm.is_active) AS active_staff
  FROM public.organizations org
) s
WHERE s.id = o.id;

UPDATE public.organizations
SET
  license_start_date = now(),
  -- Ends with the last second of the 15th day in Cuba
  license_end_date =
    (((now() AT TIME ZONE 'America/Havana')::date + 16)::timestamp
      AT TIME ZONE 'America/Havana') - interval '1 second'
WHERE license_end_date IS NOT NULL
  AND license_end_date < now() + interval '15 days';

-- ---------------------------------------------------------------------------
-- 4. Payment ledger. One row per recorded payment; the amount is frozen, so a
--    later price change never alters what was charged. Rows are written only
--    by record_license_payment() (phase 2).
-- ---------------------------------------------------------------------------
CREATE TABLE public.license_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  amount_usd NUMERIC(10,2) NOT NULL CHECK (amount_usd >= 0),
  license_plan TEXT NOT NULL,
  second_module BOOLEAN NOT NULL DEFAULT false,
  billing_period TEXT NOT NULL
    CHECK (billing_period IN ('monthly', 'quarterly', 'semiannual', 'annual')),
  founder_price BOOLEAN NOT NULL DEFAULT false,
  covered_from DATE NOT NULL,
  covered_until DATE NOT NULL,
  note TEXT,
  recorded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (covered_until >= covered_from)
);

CREATE INDEX license_payments_org_idx
  ON public.license_payments (organization_id, created_at DESC);

ALTER TABLE public.license_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read license payments"
  ON public.license_payments FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

REVOKE ALL ON public.license_payments FROM PUBLIC, anon;
GRANT SELECT ON public.license_payments TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Phase guard. Applies to every role, service_role included.
--    - A trial exists only at signup: a business is created with dates, or
--      gets them within its first day. After that nothing moves it to trial.
--    - "pending" can never be entered from another phase.
--    - A pending business starts with its first payment, not with dates
--      typed by hand.
--    - The plan follows the modules: a business without appointments is on
--      the trips plan, and one with appointments is not.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_organization_license()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fresh BOOLEAN;
BEGIN
  IF NOT NEW.appointments_module_enabled THEN
    NEW.license_plan := 'trips';
  ELSIF NEW.license_plan = 'trips' THEN
    NEW.license_plan := 'personal';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.license_phase = 'pending' AND NEW.license_end_date IS NOT NULL THEN
      NEW.license_phase := 'trial';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.license_phase = 'pending' AND OLD.license_phase <> 'pending' THEN
    RAISE EXCEPTION 'license_phase_pending_not_reenterable'
      USING HINT = 'A business cannot go back to pending.';
  END IF;

  v_fresh := OLD.license_phase = 'pending'
    AND OLD.created_at > now() - interval '1 day'
    AND NOT EXISTS (
      SELECT 1 FROM public.license_payments p WHERE p.organization_id = NEW.id
    );

  IF NEW.license_phase = 'trial' AND OLD.license_phase <> 'trial' AND NOT v_fresh THEN
    RAISE EXCEPTION 'license_trial_only_at_signup'
      USING HINT = 'A trial is only granted when the business is created.';
  END IF;

  IF NEW.license_phase = 'pending'
     AND NEW.license_end_date IS NOT NULL
     AND NEW.license_end_date IS DISTINCT FROM OLD.license_end_date THEN
    IF v_fresh THEN
      NEW.license_phase := 'trial';
    ELSE
      RAISE EXCEPTION 'license_pending_needs_payment'
        USING HINT = 'A pending business starts with its first payment.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_organization_license() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER guard_organization_license
  BEFORE INSERT OR UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.guard_organization_license();

-- ---------------------------------------------------------------------------
-- 6. Only a platform admin changes the plan, the phase or the billing data
--    (048 lists the protected columns one by one).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_module_change_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.appointments_module_enabled IS DISTINCT FROM OLD.appointments_module_enabled
      OR NEW.trips_module_enabled IS DISTINCT FROM OLD.trips_module_enabled
      OR NEW.license_start_date IS DISTINCT FROM OLD.license_start_date
      OR NEW.license_end_date IS DISTINCT FROM OLD.license_end_date
      OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
      OR NEW.subscription_platform IS DISTINCT FROM OLD.subscription_platform
      OR NEW.subscription_product_id IS DISTINCT FROM OLD.subscription_product_id
      OR NEW.subscription_updated_at IS DISTINCT FROM OLD.subscription_updated_at
      OR NEW.is_active IS DISTINCT FROM OLD.is_active
      OR NEW.license_plan IS DISTINCT FROM OLD.license_plan
      OR NEW.license_phase IS DISTINCT FROM OLD.license_phase
      OR NEW.billing_period IS DISTINCT FROM OLD.billing_period
      OR NEW.license_founder IS DISTINCT FROM OLD.license_founder
      OR NEW.founder_price_until IS DISTINCT FROM OLD.founder_price_until
      OR NEW.referred_by_organization_id IS DISTINCT FROM OLD.referred_by_organization_id
      OR NEW.referral_credit_applied_at IS DISTINCT FROM OLD.referral_credit_applied_at)
     AND auth.uid() IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.user_profiles
       WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
     )
  THEN
    RAISE EXCEPTION 'Only a platform admin can change the organization modules, license or subscription';
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. check_license_status: same signature and return shape (the view, RLS and
--    the client hang from it). The grace period now comes from
--    license_grace_days(); grace_period_days is kept only so existing callers
--    keep working and is ignored. A pending business is blocked.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_license_status(
  org_id UUID,
  grace_period_days INTEGER DEFAULT 5
)
RETURNS TABLE (
  status license_status,
  days_remaining INTEGER,
  is_usable BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
STABLE
AS $function$
DECLARE
  org_record RECORD;
  now_ts TIMESTAMPTZ;
  grace_end TIMESTAMPTZ;
  days_diff INTEGER;
BEGIN
  now_ts := now();

  SELECT
    o.is_active,
    o.license_start_date,
    o.license_end_date,
    o.license_phase
  INTO org_record
  FROM public.organizations o
  WHERE o.id = org_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      'expired'::license_status,
      0,
      false,
      'Organización no encontrada'::TEXT;
    RETURN;
  END IF;

  IF NOT org_record.is_active THEN
    RETURN QUERY SELECT
      'expired'::license_status,
      0,
      false,
      'La organización ha sido desactivada'::TEXT;
    RETURN;
  END IF;

  IF org_record.license_phase = 'pending' THEN
    RETURN QUERY SELECT
      'expired'::license_status,
      0,
      false,
      'Tu negocio está en preparación. Empezará a funcionar cuando registremos tu primer pago'::TEXT;
    RETURN;
  END IF;

  IF org_record.license_start_date IS NULL OR org_record.license_end_date IS NULL THEN
    RETURN QUERY SELECT
      'no_license'::license_status,
      NULL::INTEGER,
      true,
      'Sin licencia configurada - acceso de prueba'::TEXT;
    RETURN;
  END IF;

  IF now_ts < org_record.license_start_date THEN
    days_diff := CEIL(EXTRACT(EPOCH FROM org_record.license_start_date - now_ts) / 86400)::INTEGER;
    RETURN QUERY SELECT
      'expired'::license_status,
      -days_diff,
      false,
      CASE
        WHEN days_diff = 1 THEN 'La licencia comienza en 1 día'
        ELSE format('La licencia comienza en %s días', days_diff)
      END::TEXT;
    RETURN;
  END IF;

  IF now_ts <= org_record.license_end_date THEN
    days_diff := CEIL(EXTRACT(EPOCH FROM org_record.license_end_date - now_ts) / 86400)::INTEGER;
    RETURN QUERY SELECT
      'active'::license_status,
      days_diff,
      true,
      CASE
        WHEN days_diff > 30 THEN 'Licencia activa'
        WHEN days_diff = 1 THEN 'Te queda 1 día de acceso'
        ELSE format('Te quedan %s días de acceso', days_diff)
      END::TEXT;
    RETURN;
  END IF;

  grace_end := org_record.license_end_date + make_interval(days => public.license_grace_days());

  IF now_ts <= grace_end THEN
    days_diff := CEIL(EXTRACT(EPOCH FROM grace_end - now_ts) / 86400)::INTEGER;
    RETURN QUERY SELECT
      'grace_period'::license_status,
      days_diff,
      true,
      CASE
        WHEN days_diff = 1 THEN 'Tu licencia venció. Te queda 1 día antes del bloqueo'
        ELSE format('Tu licencia venció. Te quedan %s días antes del bloqueo', days_diff)
      END::TEXT;
    RETURN;
  END IF;

  days_diff := FLOOR(EXTRACT(EPOCH FROM now_ts - org_record.license_end_date) / 86400)::INTEGER;
  RETURN QUERY SELECT
    'expired'::license_status,
    -days_diff,
    false,
    CASE
      WHEN days_diff = 1 THEN 'Tu licencia venció hace 1 día'
      ELSE format('Tu licencia venció hace %s días', days_diff)
    END::TEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.org_license_usable(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT ls.is_usable FROM public.check_license_status(p_org_id) ls),
    false
  );
$function$;

-- ---------------------------------------------------------------------------
-- 8. License view: same columns in the same order, new ones appended (so it
--    can be replaced in place and keeps its grants).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.organizations_with_license_status
WITH (security_invoker = true) AS
SELECT
  o.id,
  o.name,
  o.timezone,
  o.slug,
  o.whatsapp_phone,
  o.created_at,
  o.license_start_date,
  o.license_end_date,
  o.is_active,
  o.subscription_platform,
  o.subscription_product_id,
  o.subscription_status,
  o.subscription_updated_at,
  o.appointments_module_enabled,
  o.trips_module_enabled,
  o.currency,
  o.contact_name,
  ls.status AS license_status,
  ls.days_remaining,
  ls.is_usable,
  ls.message AS license_message,
  o.license_plan,
  o.license_phase,
  o.billing_period,
  o.license_founder,
  o.founder_price_until,
  o.referred_by_organization_id,
  o.referral_credit_applied_at,
  o.owner_phone
FROM public.organizations o
CROSS JOIN LATERAL public.check_license_status(o.id) ls;

REVOKE ALL ON public.organizations_with_license_status FROM PUBLIC, anon;
GRANT SELECT ON public.organizations_with_license_status TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. Platform stats: "in grace" and "expired" follow license_grace_days()
--    (live definition, only the two license filters change).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_platform_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT up.role::TEXT INTO v_role
  FROM public.user_profiles up
  WHERE up.user_id = auth.uid() AND up.is_active = true;

  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden ver estadísticas de la plataforma';
  END IF;

  RETURN jsonb_build_object(
    'generated_at', v_now,

    'orgs', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE o.is_active),
        'license_active', COUNT(*) FILTER (WHERE o.license_end_date >= v_now),
        'license_grace', COUNT(*) FILTER (
          WHERE o.license_end_date < v_now
            AND o.license_end_date >= v_now - make_interval(days => public.license_grace_days())
        ),
        'license_expired', COUNT(*) FILTER (WHERE o.license_end_date < v_now - make_interval(days => public.license_grace_days())),
        'license_none', COUNT(*) FILTER (WHERE o.license_end_date IS NULL)
      )
      FROM public.organizations o
    ),

    -- Licencias que vencen en los próximos 30 días (para contactar antes del corte)
    'expiring_soon', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'name', o.name,
          'license_end_date', o.license_end_date,
          'subscription_platform', o.subscription_platform,
          'subscription_status', o.subscription_status
        ) ORDER BY o.license_end_date
      ), '[]'::jsonb)
      FROM public.organizations o
      WHERE o.license_end_date BETWEEN v_now AND v_now + interval '30 days'
    ),

    'subscriptions', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('status', t.subscription_status, 'platform', t.subscription_platform, 'count', t.cnt)
      ), '[]'::jsonb)
      FROM (
        SELECT o.subscription_status, o.subscription_platform, COUNT(*) AS cnt
        FROM public.organizations o
        WHERE o.subscription_status IS NOT NULL
        GROUP BY 1, 2
      ) t
    ),

    'subscription_events_30d', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('event_type', t.event_type, 'count', t.cnt) ORDER BY t.cnt DESC
      ), '[]'::jsonb)
      FROM (
        SELECT se.event_type, COUNT(*) AS cnt
        FROM public.subscription_events se
        WHERE se.created_at >= v_now - interval '30 days'
        GROUP BY se.event_type
      ) t
    ),

    -- Turnos e ingresos por mes en toda la plataforma (últimos 6 meses)
    'appointments_by_month', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('month', t.month, 'count', t.cnt, 'revenue', t.revenue) ORDER BY t.month
      ), '[]'::jsonb)
      FROM (
        SELECT to_char(date_trunc('month', a.appointment_date), 'YYYY-MM') AS month,
               COUNT(*) AS cnt,
               COALESCE(SUM(COALESCE(a.price_charged, s.price, 0)) FILTER (WHERE a.status = 'completed'), 0) AS revenue
        FROM public.appointments a
        JOIN public.services s ON s.id = a.service_id
        WHERE a.appointment_date >= (date_trunc('month', v_now) - interval '5 months')::date
        GROUP BY 1
      ) t
    ),

    'top_orgs_30d', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('id', t.id, 'name', t.name, 'appointments', t.cnt) ORDER BY t.cnt DESC
      ), '[]'::jsonb)
      FROM (
        SELECT o.id, o.name, COUNT(a.id) AS cnt
        FROM public.organizations o
        JOIN public.appointments a
          ON a.organization_id = o.id
          AND a.created_at >= v_now - interval '30 days'
        GROUP BY o.id, o.name
        ORDER BY cnt DESC
        LIMIT 10
      ) t
    ),

    -- Orgs activas sin turnos creados en 14 días: riesgo de churn
    'inactive_orgs_14d', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('id', o.id, 'name', o.name, 'last_appointment_at', la.last_created)
        ORDER BY la.last_created ASC NULLS FIRST
      ), '[]'::jsonb)
      FROM public.organizations o
      LEFT JOIN LATERAL (
        SELECT MAX(a.created_at) AS last_created
        FROM public.appointments a
        WHERE a.organization_id = o.id
      ) la ON true
      WHERE o.is_active
        AND (la.last_created IS NULL OR la.last_created < v_now - interval '14 days')
    ),

    -- Embudo de adopción: dónde se atascan las orgs nuevas
    'funnel', jsonb_build_object(
      'orgs', (SELECT COUNT(*) FROM public.organizations),
      'with_services', (SELECT COUNT(DISTINCT s.organization_id) FROM public.services s),
      'with_staff', (SELECT COUNT(DISTINCT st.organization_id) FROM public.staff_members st),
      'with_appointments', (SELECT COUNT(DISTINCT a.organization_id) FROM public.appointments a),
      'with_active_license', (SELECT COUNT(*) FROM public.organizations o WHERE o.license_end_date >= v_now)
    ),

    'whatsapp_30d', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'delivered', COUNT(*) FILTER (WHERE w.status IN ('delivered', 'read')),
        'failed', COUNT(*) FILTER (WHERE w.status = 'failed')
      )
      FROM public.wa_outbound_messages w
      WHERE w.sent_at >= v_now - interval '30 days'
    ),

    'errors', (
      SELECT jsonb_build_object(
        'last_7d', COUNT(*) FILTER (WHERE e.timestamp >= v_now - interval '7 days'),
        'unresolved', COUNT(*) FILTER (WHERE NOT e.resolved)
      )
      FROM public.error_logs e
    )
  );
END;
$function$;

-- ---------------------------------------------------------------------------
-- 10. Google Play (decision A-8): a purchase leaves the business as paid, so
--     it is never shown as "trial" or left "pending" (live definition from
--     072 plus that one column).
-- ---------------------------------------------------------------------------
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
      -- A store purchase is a payment: the business leaves trial or pending
      license_phase = 'paid',
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
