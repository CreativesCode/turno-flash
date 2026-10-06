-- ============================================
-- 055: WhatsApp intent to ask which appointment to cancel (QA plan P0-18)
-- ============================================
-- A customer with several open appointments who answers "CANCELAR" used to
-- lose the one that received the last message, not necessarily the one they
-- meant. wa-inbound now cancels nothing in that case and sends this message,
-- listing the appointment numbers so the customer replies "CANCELAR T-0045".

ALTER TYPE public.wa_outbound_intent ADD VALUE IF NOT EXISTS 'clarify_which';
