-- ============================================
-- 078: Let logged-in users write customers again
-- ============================================
-- 071 added the expression index idx_customers_phone_key on
-- booking_phone_key(phone, phone_country_code), but 029 had revoked EXECUTE on
-- that function from authenticated. Postgres evaluates index expressions with
-- the privileges of the role that writes the row, so every INSERT (and any
-- UPDATE that changes the phone) on customers from the dashboard failed with
-- "permission denied for function booking_phone_key" since 2026-10-08.
-- The function is pure text normalization, so granting it is harmless.
-- anon keeps no access (public pages go through service_role).

GRANT EXECUTE ON FUNCTION public.booking_phone_key(TEXT, TEXT) TO authenticated;
