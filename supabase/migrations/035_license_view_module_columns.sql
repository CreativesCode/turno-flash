-- ============================================
-- 035: Recreate organizations_with_license_status with the module columns
-- ============================================
-- Exactly the problem migration 023 already fixed once: the view is defined
-- with `o.*`, which freezes the column list of organizations as it was when
-- the view was created. The module columns added in 033
-- (appointments_module_enabled, trips_module_enabled) do not show up, and the
-- app expects them (OrganizationDetails in types/organization.ts, used by
-- app/dashboard/organizations/details/page.tsx).
--
-- DROP + CREATE, not CREATE OR REPLACE: the new columns of o.* land before the
-- license ones, and REPLACE cannot reorder columns.

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
Recreada en 035 para incluir las columnas de módulo añadidas en 033.';

GRANT SELECT ON public.organizations_with_license_status TO authenticated;
