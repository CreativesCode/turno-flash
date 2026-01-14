-- Migración: Corregir columna ambigua en get_my_organization_license_status
-- 
-- El error: "column reference "organization_id" is ambiguous" (código 42702)
-- ocurría porque la función tiene un parámetro de salida llamado "organization_id"
-- y la consulta también selecciona "organization_id" de user_profiles sin calificar.
--
-- Solución: Usar alias de tabla y calificar todas las referencias a columnas.

-- ============================================
-- Recrear la función con las columnas calificadas
-- ============================================

CREATE OR REPLACE FUNCTION public.get_my_organization_license_status(
  grace_period_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  organization_id UUID,
  organization_name TEXT,
  status license_status,
  days_remaining INTEGER,
  is_usable BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_org_id UUID;
BEGIN
  -- Obtener la organización del usuario actual
  -- IMPORTANTE: Usar alias 'up' para evitar ambigüedad con el parámetro de salida 'organization_id'
  SELECT up.organization_id INTO user_org_id
  FROM public.user_profiles up
  WHERE up.user_id = auth.uid();
  
  -- Si el usuario no tiene organización asignada
  IF user_org_id IS NULL THEN
    RETURN QUERY SELECT 
      NULL::UUID,
      'Sin organización'::TEXT,
      'no_license'::license_status,
      NULL::INTEGER,
      true,
      'Usuario sin organización asignada'::TEXT;
    RETURN;
  END IF;
  
  -- Retornar estado de licencia de la organización
  RETURN QUERY 
  SELECT 
    o.id,
    o.name,
    ls.status,
    ls.days_remaining,
    ls.is_usable,
    ls.message
  FROM public.organizations o
  CROSS JOIN LATERAL public.check_license_status(o.id, grace_period_days) ls
  WHERE o.id = user_org_id;
END;
$$;

COMMENT ON FUNCTION public.get_my_organization_license_status IS 
'Obtiene el estado de licencia de la organización del usuario actual.
Útil para verificar en la UI si el usuario puede realizar acciones.
Corregido para evitar ambigüedad con la columna organization_id (migración 013).';
