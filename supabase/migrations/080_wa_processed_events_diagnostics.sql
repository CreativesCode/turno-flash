-- ============================================
-- 080: Keep what wa-inbound received and decided
-- ============================================
-- Edge Function logs are not reachable from the tools we have, so a customer
-- reply that "did nothing" could not be explained (2026-10-14, T-0003 of
-- Espiral Studio). wa-inbound now stores a compact copy of the webhook payload
-- on the idempotency row and, when it is done, the business it resolved and
-- the outcome. Only service_role writes here; nobody else reads it.

ALTER TABLE public.wa_processed_events
  ADD COLUMN IF NOT EXISTS payload JSONB,
  ADD COLUMN IF NOT EXISTS result TEXT;

COMMENT ON COLUMN public.wa_processed_events.payload IS
  'Compact copy of the OpenWA webhook payload (sender, type, first chars of the body)';
COMMENT ON COLUMN public.wa_processed_events.result IS
  'What wa-inbound did with the event (matched appointment, skip reason, error)';
