-- ============================================
-- 048: Security hardening before the Cuba pilot (QA plan P0-01, P0-03, P0-04, P0-05)
-- ============================================
-- 1. Anonymous visitors could read every organization's customers through
--    search_customers_fulltext (SECURITY DEFINER, executable by anon) and the
--    two public views (owned by postgres, so they skipped RLS).
-- 2. Any owner could read, edit and delete profiles of other organizations.
-- 3. Any owner could extend their own license through the API.
-- 4. A deactivated member kept full access and could reactivate themselves.
--
-- Point 4 is solved at a single place: every org policy checks membership with
-- a subquery on user_profiles, and that subquery runs under user_profiles RLS.
-- An inactive member can no longer see their own profile row, so all those
-- policies stop matching without rewriting each of them.

-- --------------------------------------------
-- Helpers
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.user_profiles
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
$$;

-- anon keeps EXECUTE on purpose: org policies call these through the
-- user_profiles subquery, and for anon they just return false / NULL. Revoking
-- it would turn "no rows" into a permission error on every table.
GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_org_id() TO anon, authenticated;

-- --------------------------------------------
-- P0-01: functions and views must respect RLS and never be open to anon
-- --------------------------------------------

ALTER FUNCTION public.search_customers_fulltext(uuid, text, boolean, integer, integer)
  SECURITY INVOKER;
ALTER FUNCTION public.search_customers_fulltext(uuid, text, boolean, integer, integer)
  SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.search_customers_fulltext(uuid, text, boolean, integer, integer)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_customers_fulltext(uuid, text, boolean, integer, integer)
  TO authenticated;

-- error_logs SELECT is admin-only by RLS; as SECURITY DEFINER this leaked the
-- most common error message of any organization to anyone.
ALTER FUNCTION public.get_error_stats(uuid, integer) SECURITY INVOKER;
ALTER FUNCTION public.get_error_stats(uuid, integer) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.get_error_stats(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_error_stats(uuid, integer) TO authenticated;

-- Rule for whoever recreates these views (023/035/040 pattern): keep
-- security_invoker, or the view goes back to bypassing RLS.
ALTER VIEW public.appointments_with_details SET (security_invoker = true);
ALTER VIEW public.organizations_with_license_status SET (security_invoker = true);
REVOKE ALL ON public.appointments_with_details FROM PUBLIC, anon;
REVOKE ALL ON public.organizations_with_license_status FROM PUBLIC, anon;
GRANT SELECT ON public.appointments_with_details TO authenticated;
GRANT SELECT ON public.organizations_with_license_status TO authenticated;

-- --------------------------------------------
-- P0-03 + P0-05: user_profiles policies, scoped by organization
-- --------------------------------------------
-- The previous set (005, 006 and later fixes) had overlapping policies where
-- is_admin_or_owner_check() gave owners access to every profile on the platform.

DROP POLICY IF EXISTS "users_select_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "admins_select_all_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "admins_update_all_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can manage roles and organizations" ON public.user_profiles;
DROP POLICY IF EXISTS "admins_insert_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins and owners can insert profiles for others" ON public.user_profiles;
DROP POLICY IF EXISTS "admins_delete_profiles" ON public.user_profiles;

-- An inactive member does not see their own row: this is what cuts their
-- access to every org table (see header).
CREATE POLICY "profiles_select_own_active" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id AND is_active = true);

CREATE POLICY "profiles_select_admin" ON public.user_profiles
  FOR SELECT USING (public.is_platform_admin());

CREATE POLICY "profiles_select_owner_org" ON public.user_profiles
  FOR SELECT USING (
    public.auth_user_role() = 'owner'
    AND organization_id = public.auth_user_org_id()
  );

CREATE POLICY "profiles_update_own" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id AND is_active = true)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles_update_admin" ON public.user_profiles
  FOR UPDATE USING (public.is_platform_admin())
  WITH CHECK (public.is_platform_admin());

CREATE POLICY "profiles_update_owner_org" ON public.user_profiles
  FOR UPDATE USING (
    public.auth_user_role() = 'owner'
    AND organization_id = public.auth_user_org_id()
  )
  WITH CHECK (
    public.auth_user_role() = 'owner'
    AND organization_id = public.auth_user_org_id()
  );

-- Profiles are created by handle_new_user, self-signup and invite-user, all of
-- which bypass RLS. From the client only a platform admin inserts or deletes.
CREATE POLICY "profiles_insert_admin" ON public.user_profiles
  FOR INSERT WITH CHECK (public.is_platform_admin());

CREATE POLICY "profiles_delete_admin" ON public.user_profiles
  FOR DELETE USING (public.is_platform_admin());

-- Same function as 026, now also guarding is_active: nobody but an admin or the
-- service role can change their own activation, and an owner cannot touch the
-- activation of another owner.
CREATE OR REPLACE FUNCTION public.prevent_role_org_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- service_role (scripts, edge functions) can change anything
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin' AND is_active = true
  ) THEN
    RETURN NEW;
  END IF;

  IF OLD.role IS DISTINCT FROM NEW.role OR OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
    -- Only exception: the promotion to owner done by create_organization_with_owner,
    -- identified by the session variable that function sets.
    IF OLD.organization_id IS NULL
       AND NEW.organization_id IS NOT NULL
       AND NEW.role = 'owner'::user_role
       AND current_setting('app.creating_org_with_owner', true) = 'true' THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'No tienes permiso para cambiar el role u organization_id. Solo los administradores pueden hacerlo.';
  END IF;

  IF OLD.is_active IS DISTINCT FROM NEW.is_active
     AND (OLD.user_id = auth.uid() OR OLD.role <> 'staff'::user_role) THEN
    RAISE EXCEPTION 'No tienes permiso para cambiar el acceso de este usuario.';
  END IF;

  RETURN NEW;
END;
$$;

-- --------------------------------------------
-- P0-04: license, subscription and activation of an organization are admin-only
-- --------------------------------------------
-- auth.uid() IS NULL lets the service role through: the RevenueCat webhook,
-- self-signup and the crons write these columns that way.

CREATE OR REPLACE FUNCTION public.enforce_module_change_is_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (NEW.appointments_module_enabled IS DISTINCT FROM OLD.appointments_module_enabled
      OR NEW.trips_module_enabled IS DISTINCT FROM OLD.trips_module_enabled
      OR NEW.license_start_date IS DISTINCT FROM OLD.license_start_date
      OR NEW.license_end_date IS DISTINCT FROM OLD.license_end_date
      OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
      OR NEW.subscription_platform IS DISTINCT FROM OLD.subscription_platform
      OR NEW.subscription_product_id IS DISTINCT FROM OLD.subscription_product_id
      OR NEW.subscription_updated_at IS DISTINCT FROM OLD.subscription_updated_at
      OR NEW.is_active IS DISTINCT FROM OLD.is_active)
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
$$;
