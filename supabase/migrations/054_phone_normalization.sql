-- ============================================
-- 054: Phone normalization for Cuban numbers (QA plan P0-17)
-- ============================================
-- booking_phone_key treated any number that starts with the country code as
-- already prefixed. Cuban mobiles have 8 digits and many start with "53"
-- (53077035), so they lost their +53: the same customer got a second record
-- and WhatsApp went to a wrong chat id. The dashboard also defaulted the
-- country code to +54 or +1. Same rule as utils/phone.ts and phoneToChatId:
--   - "+..." or "00..." is international as typed;
--   - otherwise it carries the country code only if it starts with it AND has
--     more than 8 digits; leading zeros of a national number are dropped.

CREATE OR REPLACE FUNCTION public.booking_phone_key(p_phone TEXT, p_country_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  WITH n AS (
    SELECT
      btrim(coalesce(p_phone, '')) AS raw,
      regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') AS digits,
      regexp_replace(coalesce(p_country_code, ''), '\D', '', 'g') AS cc
  )
  SELECT CASE
    WHEN raw LIKE '+%' THEN digits
    WHEN digits LIKE '00%' THEN substr(digits, 3)
    WHEN cc = '' THEN digits
    WHEN digits LIKE cc || '%' AND length(digits) > 8 THEN digits
    ELSE cc || ltrim(digits, '0')
  END
  FROM n;
$$;

-- Every business is in Cuba: national 8-digit numbers saved without prefix
-- (under the old +54/+1 defaults) become +53, and "+" numbers lose their
-- spaces so equality lookups match.
UPDATE public.customers
SET phone = '+53' || regexp_replace(phone, '\D', '', 'g'),
    phone_country_code = '+53'
WHERE btrim(phone) NOT LIKE '+%'
  AND length(regexp_replace(phone, '\D', '', 'g')) = 8;

UPDATE public.customers
SET phone = '+' || regexp_replace(phone, '\D', '', 'g')
WHERE btrim(phone) LIKE '+%'
  AND phone <> '+' || regexp_replace(phone, '\D', '', 'g');

ALTER TABLE public.customers ALTER COLUMN phone_country_code SET DEFAULT '+53';
