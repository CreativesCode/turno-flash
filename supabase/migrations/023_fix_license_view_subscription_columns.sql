-- Migración: Recrear organizations_with_license_status con las columnas de suscripción
-- Ejecutar después de 022_analytics_functions.sql
--
-- PROBLEMA: la vista se creó en 008 con `o.*`, que congela las columnas de
-- organizations existentes en ese momento. Las columnas de suscripción añadidas
-- en 021 (subscription_platform, subscription_product_id, subscription_status,
-- subscription_updated_at) NO aparecen en la vista, aunque la app las espera
-- (OrganizationDetails en types/organization.ts).
--
-- Se hace DROP + CREATE porque CREATE OR REPLACE VIEW no permite reordenar
-- columnas (las nuevas de o.* quedarían antes de las de licencia).

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
Recreada en 023 para incluir las columnas de suscripción añadidas en 021.';

GRANT SELECT ON public.organizations_with_license_status TO authenticated;
