-- P0-05 follow-up: a member whose access was removed can no longer read their
-- own profile (profiles_select_own_active, 048), so the app could only say
-- "Sin organización asignada". This tells them the real reason without
-- exposing anything else of the profile.

CREATE OR REPLACE FUNCTION public.my_access_revoked()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND is_active = false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.my_access_revoked() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_access_revoked() TO authenticated;
