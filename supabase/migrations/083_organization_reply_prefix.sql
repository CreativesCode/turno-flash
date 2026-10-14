-- ============================================
-- 083: A short code per business for WhatsApp replies
-- ============================================
-- Appointment numbers restart at T-0001 in every business, and the pilot's
-- businesses share one WhatsApp line, so "OK T-0001" cannot tell them apart.
-- Customer messages now show the code as <prefix>-<number> ("ES-0001") and
-- wa-inbound accepts it loosely (es-0001, es001, es 1). Businesses without a
-- prefix keep "T-0001". Set by the platform admin; only Espiral Studio for now.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS reply_prefix TEXT
  CHECK (reply_prefix ~ '^[A-Z]{2,4}$');

CREATE UNIQUE INDEX IF NOT EXISTS organizations_reply_prefix_key
  ON public.organizations (reply_prefix)
  WHERE reply_prefix IS NOT NULL;

COMMENT ON COLUMN public.organizations.reply_prefix IS
  'Short code customers type in WhatsApp replies ("ES" -> "OK ES-0001"). NULL keeps T-0001.';

UPDATE public.organizations
SET reply_prefix = 'ES'
WHERE id = '7d4c1979-9b59-4b29-a97e-0962c8882fe4'  -- Espiral Studio
  AND reply_prefix IS NULL;
