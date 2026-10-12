-- PRP-003 phase 2: price list and "record payment".
--
-- The price list lives here and in config/license-pricing.ts (which only
-- displays it). The amount and the covered dates are always computed by the
-- database: license_payment_quote() is what the admin previews and
-- record_license_payment() charges exactly that.
--
-- Fair payment (ported from LensSpace):
--   covered_from = greatest(expiry + 1, today - grace)
-- so paying early never loses days, the grace days used are charged, and the
-- days a business spent blocked are not. A pending business starts today.
-- All day arithmetic is in Cuban calendar days.

ALTER TABLE public.license_payments
  ADD COLUMN referral_days_granted INTEGER,
  ADD COLUMN referral_granted_to UUID REFERENCES public.organizations(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.license_payments.referral_days_granted IS
  'Days added to the referrer when this was the first payment of a referred business.';

-- ---------------------------------------------------------------------------
-- Price list (USD per month)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.license_plan_monthly_price(
  p_plan TEXT,
  p_founder BOOLEAN,
  p_second_module BOOLEAN
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT
    CASE p_plan
      WHEN 'personal'    THEN CASE WHEN p_founder THEN 3 ELSE 5 END
      WHEN 'salon'       THEN CASE WHEN p_founder THEN 6 ELSE 10 END
      WHEN 'salon_large' THEN CASE WHEN p_founder THEN 9 ELSE 15 END
      WHEN 'trips'       THEN CASE WHEN p_founder THEN 3 ELSE 5 END
    END
    -- The second module costs the same for a founder (decision A-2)
    + CASE WHEN p_second_module THEN 3 ELSE 0 END;
$$;

-- Months covered and months charged per billing period (annual pays 10 for 12)
CREATE OR REPLACE FUNCTION public.license_period_months(p_period TEXT)
RETURNS TABLE (covered INTEGER, charged INTEGER)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT c.covered, c.charged
  FROM (VALUES
    ('monthly', 1, 1),
    ('quarterly', 3, 3),
    ('semiannual', 6, 6),
    ('annual', 12, 10)
  ) AS c(period, covered, charged)
  WHERE c.period = p_period;
$$;

CREATE OR REPLACE FUNCTION public.license_today()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$ SELECT (now() AT TIME ZONE 'America/Havana')::date $$;

-- ---------------------------------------------------------------------------
-- Quote: what a payment would charge and cover. Internal: callers check access.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.license_payment_quote_internal(
  p_organization_id UUID,
  p_billing_period TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_months RECORD;
  v_today DATE := public.license_today();
  v_expires_on DATE;
  v_from DATE;
  v_until DATE;
  v_second BOOLEAN;
  v_founder BOOLEAN;
  v_monthly NUMERIC;
  v_first BOOLEAN;
BEGIN
  SELECT * INTO v_org FROM public.organizations WHERE id = p_organization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'organization_not_found';
  END IF;

  SELECT * INTO v_months FROM public.license_period_months(p_billing_period);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_billing_period';
  END IF;

  IF v_org.license_phase = 'pending' OR v_org.license_end_date IS NULL THEN
    v_from := v_today;
  ELSE
    v_expires_on := (v_org.license_end_date AT TIME ZONE 'America/Havana')::date;
    v_from := GREATEST(v_expires_on + 1, v_today - public.license_grace_days());
  END IF;
  v_until := (v_from + make_interval(months => v_months.covered))::date - 1;

  v_second := v_org.appointments_module_enabled AND v_org.trips_module_enabled;
  -- The founder price applies to periods that start within the price lock;
  -- before the first payment the lock has not started yet.
  v_founder := v_org.license_founder
    AND (v_org.founder_price_until IS NULL OR v_from <= v_org.founder_price_until);
  v_monthly := public.license_plan_monthly_price(v_org.license_plan, v_founder, v_second);

  v_first := NOT EXISTS (
    SELECT 1 FROM public.license_payments p WHERE p.organization_id = p_organization_id
  );

  RETURN jsonb_build_object(
    'license_plan', v_org.license_plan,
    'billing_period', p_billing_period,
    'second_module', v_second,
    'founder_price', v_founder,
    'monthly_usd', v_monthly,
    'amount_usd', v_monthly * v_months.charged,
    'covered_from', v_from,
    'covered_until', v_until,
    'first_payment', v_first
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.license_payment_quote_internal(UUID, TEXT) FROM PUBLIC, anon, authenticated;

-- Preview for the platform admin
CREATE OR REPLACE FUNCTION public.license_payment_quote(
  p_organization_id UUID,
  p_billing_period TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only a platform admin can quote a license payment';
  END IF;
  RETURN public.license_payment_quote_internal(p_organization_id, p_billing_period);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.license_payment_quote(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.license_payment_quote(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Record a payment: ledger row, license dates, founder lock and referral
-- credit in one transaction.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.record_license_payment(
  p_organization_id UUID,
  p_billing_period TEXT,
  p_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org public.organizations%ROWTYPE;
  v_quote JSONB;
  v_from DATE;
  v_until DATE;
  v_from_ts TIMESTAMPTZ;
  v_payment_id UUID;
  v_referrer public.organizations%ROWTYPE;
  v_referral_days INTEGER;
  v_today DATE := public.license_today();
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only a platform admin can record a license payment';
  END IF;

  -- Serializes two payments on the same business
  SELECT * INTO v_org FROM public.organizations WHERE id = p_organization_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'organization_not_found';
  END IF;

  v_quote := public.license_payment_quote_internal(p_organization_id, p_billing_period);
  v_from := (v_quote ->> 'covered_from')::date;
  v_until := (v_quote ->> 'covered_until')::date;
  v_from_ts := v_from::timestamp AT TIME ZONE 'America/Havana';

  -- Referral credit: only on the first payment of a referred business
  IF (v_quote ->> 'first_payment')::boolean
     AND v_org.referred_by_organization_id IS NOT NULL
     AND v_org.referral_credit_applied_at IS NULL THEN
    SELECT * INTO v_referrer FROM public.organizations
    WHERE id = v_org.referred_by_organization_id FOR UPDATE;
    -- A referrer without an expiry date has nothing to extend
    IF FOUND AND v_referrer.license_end_date IS NOT NULL THEN
      v_referral_days := CASE
        WHEN v_referrer.license_founder
             AND (v_referrer.founder_price_until IS NULL OR v_referrer.founder_price_until >= v_today)
        THEN 15 ELSE 10 END;
      UPDATE public.organizations
      SET license_end_date = license_end_date + make_interval(days => v_referral_days)
      WHERE id = v_referrer.id;
    END IF;
  END IF;

  INSERT INTO public.license_payments (
    organization_id, amount_usd, license_plan, second_module, billing_period,
    founder_price, covered_from, covered_until, note, recorded_by,
    referral_days_granted, referral_granted_to
  )
  VALUES (
    p_organization_id,
    (v_quote ->> 'amount_usd')::numeric,
    v_org.license_plan,
    (v_quote ->> 'second_module')::boolean,
    p_billing_period,
    (v_quote ->> 'founder_price')::boolean,
    v_from,
    v_until,
    NULLIF(btrim(p_note), ''),
    auth.uid(),
    v_referral_days,
    CASE WHEN v_referral_days IS NOT NULL THEN v_referrer.id END
  )
  RETURNING id INTO v_payment_id;

  UPDATE public.organizations
  SET
    license_phase = 'paid',
    billing_period = p_billing_period,
    -- Never moves the start into the future (a payment made early)
    license_start_date = LEAST(COALESCE(license_start_date, v_from_ts), v_from_ts),
    -- Ends with the last second of the covered day in Cuba
    license_end_date =
      ((v_until + 1)::timestamp AT TIME ZONE 'America/Havana') - interval '1 second',
    -- The 24-month founder lock starts with the first payment (decision A-4)
    founder_price_until = CASE
      WHEN license_founder AND founder_price_until IS NULL
      THEN (v_from + interval '24 months')::date - 1
      ELSE founder_price_until
    END,
    referral_credit_applied_at = CASE
      WHEN v_referral_days IS NOT NULL THEN now()
      ELSE referral_credit_applied_at
    END
  WHERE id = p_organization_id;

  RETURN v_quote || jsonb_build_object(
    'payment_id', v_payment_id,
    'referral_days', v_referral_days,
    'referrer_name', CASE WHEN v_referral_days IS NOT NULL THEN v_referrer.name END
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_license_payment(UUID, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_license_payment(UUID, TEXT, TEXT) TO authenticated;
