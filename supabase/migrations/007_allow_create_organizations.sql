-- Migración: Permitir creación de organizaciones y asociar usuarios como owners
-- Ejecutar después de 002_organizations_rls.sql
--
-- Cambios:
-- 1. Permitir que usuarios autenticados puedan crear organizaciones
-- 2. Crear función para crear organización y asociar usuario como owner
-- 3. Actualizar trigger para permitir cambio de role/organization_id en contexto de creación de organización

-- ============================================
-- 1. Eliminar política restrictiva de creación de organizaciones (si existe)
-- ============================================

DROP POLICY IF EXISTS "Admins can create organizations" ON public.organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON public.organizations;

-- ============================================
-- 2. Crear política que permite solo a admins crear organizaciones
-- ============================================

-- Política: Solo admins pueden crear organizaciones
CREATE POLICY "Admins can create organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
        AND role = 'admin'
        AND is_active = true
    )
  );

COMMENT ON POLICY "Admins can create organizations" ON public.organizations IS 
  'Solo administradores pueden crear nuevas organizaciones';

-- ============================================
-- 3. Función para crear organización y asociar usuario como owner
-- ============================================

CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  org_name TEXT,
  org_slug TEXT,
  org_timezone TEXT DEFAULT 'UTC',
  org_whatsapp_phone TEXT DEFAULT NULL,
  owner_user_id UUID DEFAULT NULL,
  owner_email TEXT DEFAULT NULL
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

  -- Crear la organización
  INSERT INTO public.organizations (name, slug, timezone, whatsapp_phone)
  VALUES (org_name, org_slug, org_timezone, org_whatsapp_phone)
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
'Crea una organización y asocia un usuario como owner.
Si el usuario ya existe (staff u otro rol), se actualiza a owner.
Si el usuario no tiene perfil, se crea uno como owner.
Parámetros:
- org_name: Nombre de la organización
- org_slug: Slug único para la organización
- org_timezone: Zona horaria (default: UTC)
- org_whatsapp_phone: Teléfono de WhatsApp (opcional)
- owner_user_id: UUID del usuario a convertir en owner (opcional si se proporciona owner_email)
- owner_email: Email del usuario a convertir en owner (opcional si se proporciona owner_user_id)';

-- ============================================
-- 4. Actualizar trigger para permitir cambio de role/organization_id cuando se crea organización
-- ============================================

-- Eliminar el trigger anterior
DROP TRIGGER IF EXISTS prevent_role_org_change_trigger ON public.user_profiles;

-- Crear función mejorada que permite cambio de role/organization_id en contexto de creación
CREATE OR REPLACE FUNCTION public.prevent_role_org_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar si el usuario actual es admin
  IF EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    -- Los admins pueden cambiar cualquier cosa
    RETURN NEW;
  END IF;

  -- Si no es admin, no puede cambiar role ni organization_id
  -- EXCEPCIÓN: Si el usuario no tenía organización antes (organization_id era NULL)
  -- y está asignando una organización, se permite (caso de creación de organización)
  IF OLD.role IS DISTINCT FROM NEW.role OR OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
    -- Permitir si:
    -- 1. El usuario no tenía organización (OLD.organization_id IS NULL)
    -- 2. Y está asignando una organización (NEW.organization_id IS NOT NULL)
    -- 3. Y está cambiando a owner (NEW.role = 'owner')
    -- 4. Y (el usuario está actualizando su propio perfil O viene de create_organization_with_owner)
    --
    -- Nota: Esto permite que:
    -- - Un usuario se actualice a sí mismo cuando crea una organización
    -- - La función create_organization_with_owner (SECURITY DEFINER) actualice otros usuarios
    IF OLD.organization_id IS NULL 
       AND NEW.organization_id IS NOT NULL 
       AND NEW.role = 'owner'::user_role 
       AND (OLD.user_id = auth.uid() OR current_setting('app.creating_org_with_owner', true) = 'true') THEN
      -- Permitir este cambio (creación de organización con usuario como owner)
      RETURN NEW;
    END IF;
    
    -- Cualquier otro caso: denegar
    RAISE EXCEPTION 'No tienes permiso para cambiar el role u organization_id. Solo los administradores pueden hacerlo, o puedes convertirte en owner de una nueva organización que crees (si no tienes organización asignada).';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
CREATE TRIGGER prevent_role_org_change_trigger
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_org_change();

COMMENT ON FUNCTION public.prevent_role_org_change IS 
'Previene que usuarios no-admin cambien su role u organization_id.
Excepción: Permite que un usuario sin organización se convierta en owner de una nueva organización.';
