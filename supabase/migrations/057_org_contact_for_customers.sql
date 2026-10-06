-- ============================================
-- 057: Who customers should write to (WhatsApp messages)
-- ============================================
-- Messages go out from an automated number that only understands OK/CANCELAR.
-- Customers who wrote anything else to it reached nobody. Messages now point
-- to the business contact: contact_name + whatsapp_phone (the same number that
-- receives the business notifications), editable by the owner in Settings.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS contact_name TEXT
  CHECK (contact_name IS NULL OR length(contact_name) <= 60);

-- Same normalization as 054 for the business number (8-digit Cuban numbers
-- saved without +53, and spaces inside "+" numbers).
UPDATE public.organizations
SET whatsapp_phone = '+53' || regexp_replace(whatsapp_phone, '\D', '', 'g')
WHERE whatsapp_phone IS NOT NULL
  AND btrim(whatsapp_phone) NOT LIKE '+%'
  AND length(regexp_replace(whatsapp_phone, '\D', '', 'g')) = 8;

UPDATE public.organizations
SET whatsapp_phone = '+' || regexp_replace(whatsapp_phone, '\D', '', 'g')
WHERE btrim(whatsapp_phone) LIKE '+%'
  AND whatsapp_phone <> '+' || regexp_replace(whatsapp_phone, '\D', '', 'g');

-- "+52564206" (a Cuban number saved with its leading 53 dropped) cannot be
-- told apart from a real foreign number, so it is left for the owner to fix.

-- The view freezes `o.*` at creation (rule of 023/035/040): recreate it, and
-- keep the 048 security settings.
DROP VIEW IF EXISTS public.organizations_with_license_status;

CREATE VIEW public.organizations_with_license_status
WITH (security_invoker = true) AS
SELECT
  o.*,
  ls.status AS license_status,
  ls.days_remaining,
  ls.is_usable,
  ls.message AS license_message
FROM public.organizations o
CROSS JOIN LATERAL public.check_license_status(o.id, 7) ls;

REVOKE ALL ON public.organizations_with_license_status FROM PUBLIC, anon;
GRANT SELECT ON public.organizations_with_license_status TO authenticated;

-- The temporary @lid diagnostic of 056 is no longer needed.
DROP TABLE IF EXISTS public.wa_inbound_debug;
