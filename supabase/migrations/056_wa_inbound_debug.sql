-- ============================================
-- 056: TEMPORARY diagnostic table for WhatsApp replies from @lid aliases
-- ============================================
-- Replies arrive from "<id>@lid" and can't be matched to a customer, because
-- the alias was resolved through outbound message ids and OpenWA answers HTTP
-- 500 without returning them. This stores the raw payload and what OpenWA's
-- contact check returns for the recent chats, to choose the fix. Service role
-- only (RLS on, no policies). Dropped by the migration that ships the fix.

CREATE TABLE IF NOT EXISTS public.wa_inbound_debug (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload JSONB,
  checks JSONB
);

ALTER TABLE public.wa_inbound_debug ENABLE ROW LEVEL SECURITY;
