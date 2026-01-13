-- Migración: Sistema de gestión de licencias para organizaciones
-- Ejecutar después de 007_allow_create_organizations.sql
--
-- Cambios:
-- 1. Agregar campos de licencia a la tabla organizations
-- 2. Crear función para verificar estado de licencia
-- 3. Crear vista para obtener organizaciones con estado de licencia

-- ============================================
-- 1. Agregar campos de licencia a organizations
-- ============================================

-- Agregar campos de fechas de licencia
ALTER TABLE public.organizations 
ADD COLUMN license_start_date TIMESTAMPTZ,
ADD COLUMN license_end_date TIMESTAMPTZ,
ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Índices para mejorar consultas de licencias
CREATE INDEX idx_organizations_license_dates ON public.organizations(license_end_date, is_active);
CREATE INDEX idx_organizations_is_active ON public.organizations(is_active);

-- Comentarios
COMMENT ON COLUMN public.organizations.license_start_date IS 'Fecha de inicio de la licencia de la organización';
COMMENT ON COLUMN public.organizations.license_end_date IS 'Fecha de fin de la licencia de la organización';
COMMENT ON COLUMN public.organizations.is_active IS 'Indica si la organización está activa (independiente de la licencia, para desactivaciones manuales)';

-- ============================================
-- 2. Tipo enum para estado de licencia
-- ============================================

CREATE TYPE license_status AS ENUM ('active', 'grace_period', 'expired', 'no_license');

COMMENT ON TYPE license_status IS 
'Estados de licencia: 
- active: Licencia vigente
- grace_period: En período de gracia (expirada pero aún usable)
- expired: Licencia expirada sin período de gracia
- no_license: Sin licencia configurada (acceso limitado o prueba)';

-- ============================================
-- 3. Función para verificar estado de licencia
-- ============================================

CREATE OR REPLACE FUNCTION public.check_license_status(
  org_id UUID,
  grace_period_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  status license_status,
  days_remaining INTEGER,
  is_usable BOOLEAN,
  message TEXT
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  org_record RECORD;
  now_ts TIMESTAMPTZ;
  days_diff INTEGER;
BEGIN
  now_ts := now();
  
  -- Obtener información de la organización
  SELECT 
    o.is_active,
    o.license_start_date,
    o.license_end_date
  INTO org_record
  FROM public.organizations o
  WHERE o.id = org_id;
  
  -- Si la organización no existe
  IF NOT FOUND THEN
    RETURN QUERY SELECT 
      'expired'::license_status,
      0,
      false,
      'Organización no encontrada'::TEXT;
    RETURN;
  END IF;
  
  -- Si la organización está desactivada manualmente
  IF NOT org_record.is_active THEN
    RETURN QUERY SELECT 
      'expired'::license_status,
      0,
      false,
      'La organización ha sido desactivada'::TEXT;
    RETURN;
  END IF;
  
  -- Si no tiene licencia configurada
  IF org_record.license_start_date IS NULL OR org_record.license_end_date IS NULL THEN
    RETURN QUERY SELECT 
      'no_license'::license_status,
      NULL::INTEGER,
      true,
      'Sin licencia configurada - acceso de prueba'::TEXT;
    RETURN;
  END IF;
  
  -- Si la licencia aún no ha comenzado
  IF now_ts < org_record.license_start_date THEN
    days_diff := EXTRACT(DAY FROM org_record.license_start_date - now_ts)::INTEGER;
    RETURN QUERY SELECT 
      'expired'::license_status,
      -days_diff,
      false,
      format('La licencia comenzará en %s días', days_diff)::TEXT;
    RETURN;
  END IF;
  
  -- Calcular días restantes hasta el fin de la licencia
  days_diff := EXTRACT(DAY FROM org_record.license_end_date - now_ts)::INTEGER;
  
  -- Si la licencia está activa
  IF now_ts <= org_record.license_end_date THEN
    RETURN QUERY SELECT 
      'active'::license_status,
      days_diff,
      true,
      CASE 
        WHEN days_diff <= 7 THEN format('La licencia expirará en %s días', days_diff)
        WHEN days_diff <= 30 THEN format('La licencia expirará en %s días', days_diff)
        ELSE 'Licencia activa'
      END::TEXT;
    RETURN;
  END IF;
  
  -- Calcular días desde que expiró
  days_diff := EXTRACT(DAY FROM now_ts - org_record.license_end_date)::INTEGER;
  
  -- Si está en período de gracia
  IF days_diff <= grace_period_days THEN
    RETURN QUERY SELECT 
      'grace_period'::license_status,
      grace_period_days - days_diff,
      true,
      format('Licencia vencida - %s días restantes de período de gracia', grace_period_days - days_diff)::TEXT;
    RETURN;
  END IF;
  
  -- Licencia expirada sin período de gracia
  RETURN QUERY SELECT 
    'expired'::license_status,
    -days_diff,
    false,
    format('Licencia expirada hace %s días', days_diff)::TEXT;
END;
$$;

COMMENT ON FUNCTION public.check_license_status IS 
'Verifica el estado de la licencia de una organización.
Parámetros:
- org_id: UUID de la organización
- grace_period_days: Días de período de gracia después de expiración (default: 7)

Retorna:
- status: Estado de la licencia (active, grace_period, expired, no_license)
- days_remaining: Días restantes (positivo si activa, negativo si expirada, NULL si no hay licencia)
- is_usable: Si la organización puede usar el sistema
- message: Mensaje descriptivo del estado';

-- ============================================
-- 4. Vista para organizaciones con estado de licencia
-- ============================================

CREATE OR REPLACE VIEW public.organizations_with_license_status AS
SELECT 
  o.*,
  ls.status as license_status,
  ls.days_remaining,
  ls.is_usable,
  ls.message as license_message
FROM public.organizations o
CROSS JOIN LATERAL public.check_license_status(o.id, 7) ls;

COMMENT ON VIEW public.organizations_with_license_status IS 
'Vista que muestra todas las organizaciones con su estado de licencia calculado.
Usa un período de gracia de 7 días (configurable en la aplicación).';

-- ============================================
-- 5. RLS para vista de organizaciones con licencia
-- ============================================

-- Dar permisos de SELECT en la vista
GRANT SELECT ON public.organizations_with_license_status TO authenticated;

-- ============================================
-- 6. Función para obtener estado de licencia de organización del usuario actual
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
  SELECT organization_id INTO user_org_id
  FROM public.user_profiles
  WHERE user_id = auth.uid();
  
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
Útil para verificar en la UI si el usuario puede realizar acciones.';

-- ============================================
-- 7. Actualizar función create_organization_with_owner para incluir licencia
-- ============================================

-- Eliminar la función anterior con la firma antigua
DROP FUNCTION IF EXISTS public.create_organization_with_owner(
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  UUID,
  TEXT
);

-- Crear la nueva función con parámetros de licencia
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  org_name TEXT,
  org_slug TEXT,
  org_timezone TEXT DEFAULT 'UTC',
  org_whatsapp_phone TEXT DEFAULT NULL,
  owner_user_id UUID DEFAULT NULL,
  owner_email TEXT DEFAULT NULL,
  license_start_date TIMESTAMPTZ DEFAULT NULL,
  license_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
DECLARE
  new_org_id UUID;
  target_user_id UUID;
  existing_profile_id UUID;
  result JSONB;
BEGIN
  -- Validar que se proporcione owner_user_id o owner_email
  IF owner_user_id IS NULL AND owner_email IS NULL THEN
    RAISE EXCEPTION 'Debes proporcionar owner_user_id o owner_email';
  END IF;

  -- Validar fechas de licencia si se proporcionan
  IF license_start_date IS NOT NULL AND license_end_date IS NOT NULL THEN
    IF license_end_date <= license_start_date THEN
      RAISE EXCEPTION 'La fecha de fin de licencia debe ser posterior a la fecha de inicio';
    END IF;
  END IF;

  -- Crear la organización con licencia
  INSERT INTO public.organizations (
    name, 
    slug, 
    timezone, 
    whatsapp_phone,
    license_start_date,
    license_end_date,
    is_active
  )
  VALUES (
    org_name, 
    org_slug, 
    org_timezone, 
    org_whatsapp_phone,
    license_start_date,
    license_end_date,
    true
  )
  RETURNING id INTO new_org_id;

  -- Determinar el user_id objetivo
  IF owner_user_id IS NOT NULL THEN
    target_user_id := owner_user_id;
  ELSE
    -- Buscar usuario por email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = owner_email;
    
    IF target_user_id IS NULL THEN
      RAISE EXCEPTION 'Usuario con email % no encontrado', owner_email;
    END IF;
  END IF;

  -- Verificar si el usuario ya tiene un perfil
  SELECT id INTO existing_profile_id
  FROM public.user_profiles
  WHERE user_id = target_user_id;

  IF existing_profile_id IS NOT NULL THEN
    -- Verificar que el usuario no tenga ya una organización asignada
    IF EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = target_user_id AND organization_id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'El usuario ya tiene una organización asignada. Solo se pueden asociar usuarios sin organización o usuarios nuevos.';
    END IF;
    
    -- Establecer variable de sesión para que el trigger sepa que viene de esta función
    PERFORM set_config('app.creating_org_with_owner', 'true', false);
    
    -- Usuario existe sin organización: actualizar su perfil para ser owner de la nueva organización
    UPDATE public.user_profiles
    SET 
      role = 'owner'::user_role,
      organization_id = new_org_id,
      updated_at = now()
    WHERE user_id = target_user_id;
    
    -- Limpiar variable de sesión
    PERFORM set_config('app.creating_org_with_owner', 'false', false);
  ELSE
    -- Usuario no tiene perfil: crear perfil como owner
    INSERT INTO public.user_profiles (user_id, email, role, organization_id, is_active)
    SELECT 
      target_user_id,
      email,
      'owner'::user_role,
      new_org_id,
      true
    FROM auth.users
    WHERE id = target_user_id;
  END IF;

  -- Retornar resultado
  SELECT jsonb_build_object(
    'organization_id', new_org_id,
    'user_id', target_user_id,
    'success', true
  ) INTO result;

  RETURN result;
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'El slug de la organización ya existe';
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Error al crear organización: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.create_organization_with_owner IS 
'Crea una organización con licencia y asocia un usuario como owner.
Si el usuario ya existe (staff u otro rol), se actualiza a owner.
Si el usuario no tiene perfil, se crea uno como owner.
Parámetros:
- org_name: Nombre de la organización
- org_slug: Slug único para la organización
- org_timezone: Zona horaria (default: UTC)
- org_whatsapp_phone: Teléfono de WhatsApp (opcional)
- owner_user_id: UUID del usuario a convertir en owner (opcional si se proporciona owner_email)
- owner_email: Email del usuario a convertir en owner (opcional si se proporciona owner_user_id)
- license_start_date: Fecha de inicio de la licencia (opcional)
- license_end_date: Fecha de fin de la licencia (opcional)';
