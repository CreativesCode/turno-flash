-- PRP-003 phase 3: when a trial ends.
--
-- Signup (edge function) and the admin's "new business" form both ask the
-- database, so a trial always ends with the last second of its last day in
-- Cuba, the same way a paid period does (074). That keeps "expires today",
-- the grace period and the daily notices on whole calendar days.
CREATE OR REPLACE FUNCTION public.license_trial_end(p_days INTEGER DEFAULT 15)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $$
  SELECT ((public.license_today() + GREATEST(p_days, 1) + 1)::timestamp
          AT TIME ZONE 'America/Havana') - interval '1 second';
$$;

REVOKE EXECUTE ON FUNCTION public.license_trial_end(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.license_trial_end(INTEGER) TO authenticated, service_role;
