-- PRP-003 phase 4: active professionals allowed by each plan.
--
-- Personal allows 1 and Salón 5; Salón grande and Pasajes have no limit.
-- Enforced here so it holds for the app, the API and every role. Mirrored by
-- staffLimit in config/license-pricing.ts, which only explains it on screen.

CREATE OR REPLACE FUNCTION public.license_plan_staff_limit(p_plan TEXT)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE p_plan WHEN 'personal' THEN 1 WHEN 'salon' THEN 5 END;
$$;

-- A professional that becomes active (created active, or reactivated) must
-- fit in the plan.
CREATE OR REPLACE FUNCTION public.enforce_staff_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER;
  v_active INTEGER;
BEGIN
  IF NOT NEW.is_active OR (TG_OP = 'UPDATE' AND OLD.is_active) THEN
    RETURN NEW;
  END IF;

  -- Two professionals saved at once must not both slip under the limit
  PERFORM pg_advisory_xact_lock(hashtext('staff_limit:' || NEW.organization_id::text));

  SELECT public.license_plan_staff_limit(o.license_plan) INTO v_limit
  FROM public.organizations o WHERE o.id = NEW.organization_id;

  IF v_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_active
  FROM public.staff_members s
  WHERE s.organization_id = NEW.organization_id
    AND s.is_active
    AND s.id <> NEW.id;

  IF v_active >= v_limit THEN
    RAISE EXCEPTION 'staff_limit_reached'
      USING DETAIL = v_limit::text,
            HINT = 'The plan of this business does not allow more active professionals.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_staff_limit() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enforce_staff_limit
  BEFORE INSERT OR UPDATE OF is_active ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION public.enforce_staff_limit();

-- A business cannot be moved to a plan smaller than its team. Named to run
-- after guard_organization_license, which may rewrite the plan.
CREATE OR REPLACE FUNCTION public.license_plan_fits_staff()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_limit INTEGER := public.license_plan_staff_limit(NEW.license_plan);
  v_active INTEGER;
BEGIN
  IF v_limit IS NULL OR NEW.license_plan IS NOT DISTINCT FROM OLD.license_plan THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO v_active
  FROM public.staff_members s
  WHERE s.organization_id = NEW.id AND s.is_active;

  IF v_active > v_limit THEN
    RAISE EXCEPTION 'license_plan_too_small'
      USING DETAIL = v_active::text,
            HINT = 'Deactivate professionals before moving to a smaller plan.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.license_plan_fits_staff() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER license_plan_fits_staff
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.license_plan_fits_staff();
