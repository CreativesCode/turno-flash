-- ============================================
-- 082: Remember who each WhatsApp privacy id (@lid) is
-- ============================================
-- Customers reply from a privacy id ("76510698438852@lid"), not from their
-- phone, and the OpenWA server in use returns neither message ids (since
-- 2026-06-14) nor a lid-to-phone lookup, so a new customer's reply could not
-- be matched to the chat we wrote to. wa-inbound now learns the alias the
-- first time it can identify the sender (the reply carries the appointment
-- code, e.g. "OK T-0003") and reuses it for every later reply, in every
-- business of the line. Seeded from the message ids OpenWA used to return
-- ("true_<lid>@lid_<id>" for a message delivered to <chat_id>).
-- Written and read by service_role only (Edge Functions).

CREATE TABLE IF NOT EXISTS public.wa_sender_aliases (
  sender_id TEXT PRIMARY KEY,            -- "<digits>@lid"
  chat_id TEXT NOT NULL,                 -- "<phone>@c.us", as wa-send writes it
  source TEXT NOT NULL,                  -- message_id | reply_code | ...
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_sender_aliases_chat ON public.wa_sender_aliases (chat_id);

ALTER TABLE public.wa_sender_aliases ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only service_role (bypasses RLS) reads or writes.

INSERT INTO public.wa_sender_aliases (sender_id, chat_id, source, created_at)
SELECT DISTINCT ON (lid) lid, chat_id, 'message_id', sent_at
FROM (
  SELECT substring(message_id FROM '^true_(\d+@lid)_') AS lid, chat_id, sent_at
  FROM public.wa_outbound_messages
  WHERE message_id LIKE 'true_%@lid_%'
    AND chat_id LIKE '%@c.us'
) m
WHERE lid IS NOT NULL
ORDER BY lid, sent_at DESC
ON CONFLICT (sender_id) DO NOTHING;
