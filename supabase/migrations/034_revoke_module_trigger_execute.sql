-- ============================================
-- 034: Hide the module trigger function from the API
-- ============================================
-- Follow-up to 033, caught by `supabase db advisors`:
-- enforce_module_change_is_admin() is a trigger function but was still
-- reachable as SECURITY DEFINER at /rest/v1/rpc/enforce_module_change_is_admin
-- for anon and authenticated. Calling it outside a trigger errors out, so the
-- practical risk is nil, but it has no business being exposed and every other
-- function of 033 is already revoked.

REVOKE EXECUTE ON FUNCTION public.enforce_module_change_is_admin()
  FROM PUBLIC, anon, authenticated;
