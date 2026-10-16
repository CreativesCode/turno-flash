-- 087: an expired license blocks the business completely, reads included (D-10, PRP-005).
--
-- 027 only guarded the "manage" (write) policies, so a blocked business could still read its
-- appointments, customers, etc. through the API, and business_settings, customer_history and the
-- trip photos had no guard at all. Instead of rewriting every policy, each operational table gets
-- one RESTRICTIVE policy: it is ANDed with the existing permissive ones, so a business that is up
-- to date keeps exactly the access it has today, and a blocked one sees and changes nothing.
--
-- Left open on purpose: organizations and user_profiles (the license gate, Suscripción and
-- Mi cuenta need them), notifications, license_*, subscription_events, app_config.
-- service_role (edge functions) and SECURITY DEFINER functions skip RLS and are not affected.

-- ---------------------------------------------------------------------------
-- 1. Is the caller's business usable? Platform admins are never blocked.
--    Used as (SELECT public.auth_org_usable()) so it runs once per query, not per row.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_org_usable()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.is_platform_admin()
    OR COALESCE(public.org_license_usable(public.auth_user_org_id()), false);
$function$;

COMMENT ON FUNCTION public.auth_org_usable IS
'True if the calling user is a platform admin or their business license is usable. Fail-closed.
Used by the restrictive license policies of 087.';

REVOKE EXECUTE ON FUNCTION public.auth_org_usable() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_org_usable() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. One restrictive policy per operational table (every command)
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'appointments', 'appointment_requests', 'customers', 'customer_history',
    'services', 'service_categories', 'staff_members', 'staff_availability',
    'staff_services', 'staff_exceptions', 'waitlist', 'business_settings',
    'reminder_logs', 'wa_outbound_messages', 'trips', 'trip_pickup_points',
    'trip_bookings'
  ] LOOP
    EXECUTE format('DROP POLICY IF EXISTS "License must be usable" ON public.%I', t);
    EXECUTE format(
      'CREATE POLICY "License must be usable" ON public.%I AS RESTRICTIVE FOR ALL '
      'TO authenticated USING ((SELECT public.auth_org_usable())) '
      'WITH CHECK ((SELECT public.auth_org_usable()))',
      t
    );
  END LOOP;
END $$;

-- error_logs: reading and resolving are blocked, but the app can still report its own errors
DROP POLICY IF EXISTS "License must be usable to read" ON public.error_logs;
CREATE POLICY "License must be usable to read" ON public.error_logs
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING ((SELECT public.auth_org_usable()));

DROP POLICY IF EXISTS "License must be usable to update" ON public.error_logs;
CREATE POLICY "License must be usable to update" ON public.error_logs
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING ((SELECT public.auth_org_usable()))
  WITH CHECK ((SELECT public.auth_org_usable()));

-- Trip photos (Storage): only that bucket, the rest of storage.objects is untouched
DROP POLICY IF EXISTS "Trip photos need a usable license" ON storage.objects;
CREATE POLICY "Trip photos need a usable license" ON storage.objects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (bucket_id <> 'trip-photos' OR (SELECT public.auth_org_usable()))
  WITH CHECK (bucket_id <> 'trip-photos' OR (SELECT public.auth_org_usable()));
