-- ============================================
-- 081: Add the 'rescheduled' WhatsApp intent to the enum
-- ============================================
-- wa-send and wa-inbound have used intent 'rescheduled' since the reschedule
-- feature (October 2026), but the enum never got the value. Every inbound
-- reply filtered by intent IN (..., 'rescheduled') failed with 22P02, which
-- wa-inbound read as "no open appointment": customers' OK / CANCELAR were
-- dropped for every business since then.

ALTER TYPE public.wa_outbound_intent ADD VALUE IF NOT EXISTS 'rescheduled';
