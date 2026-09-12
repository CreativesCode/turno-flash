-- ============================================
-- 030: Pin search_path on the booking helpers from 029
-- ============================================
-- Supabase advisor 0011 (function_search_path_mutable) flagged the three
-- IMMUTABLE helpers of the public booking engine. Behavior is unchanged.

ALTER FUNCTION public.booking_time_to_min(TIME) SET search_path = public;
ALTER FUNCTION public.booking_min_to_time(INTEGER) SET search_path = public;
ALTER FUNCTION public.booking_phone_key(TEXT, TEXT) SET search_path = public;
