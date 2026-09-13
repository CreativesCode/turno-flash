-- ============================================
-- 040: Recreate organizations_with_license_status with the currency column
-- ============================================
-- Same rule as migrations 023 and 035, and the reason it is written down in
-- the PRP: the view is defined with `o.*`, which freezes the column list when
-- it is created. Every ALTER TABLE public.organizations ADD COLUMN has to
-- recreate it in the same batch or the build breaks on OrganizationDetails.

DROP VIEW IF EXISTS public.organizations_with_license_status;

CREATE VIEW public.organizations_with_license_status AS
SELECT
  o.*,
  ls.status AS license_status,
  ls.days_remaining,
  ls.is_usable,
  ls.message AS license_message
FROM public.organizations o
CROSS JOIN LATERAL public.check_license_status(o.id, 7) ls;

COMMENT ON VIEW public.organizations_with_license_status IS
'Vista que muestra todas las organizaciones con su estado de licencia calculado.
Usa un período de gracia de 7 días (configurable en la aplicación).
Recreada en 040 para incluir la moneda de la organización (migración 039).';

GRANT SELECT ON public.organizations_with_license_status TO authenticated;
