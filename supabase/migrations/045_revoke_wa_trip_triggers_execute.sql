-- ============================================
-- 045: Trigger functions are not an API
-- ============================================
-- Same finding (and same fix) as migration 034: a SECURITY DEFINER function
-- in `public` is published as an RPC by PostgREST, so the advisors flag it.
-- A trigger function has no business being callable from outside.

REVOKE EXECUTE ON FUNCTION public.trigger_wa_on_trip_booking_created()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.trigger_wa_on_trip_booking_updated()
  FROM PUBLIC, anon, authenticated;
