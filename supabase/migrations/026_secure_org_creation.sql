-- Migración: Cerrar agujeros de seguridad en la creación de organizaciones
-- Ejecutar después de 025_enable_cron_jobs.sql
--
-- Problemas que corrige:
-- 1. create_organization_with_owner es SECURITY DEFINER (salta la RLS de
--    "Admins can create organizations") y no verificaba el rol del llamante:
--    cualquier usuario autenticado podía crearse una organización sin licencia.
-- 2. prevent_role_org_change permitía que un usuario sin organización se
--    auto-promoviera a owner con un UPDATE directo (OLD.user_id = auth.uid()).
-- 3. El RPC era ejecutable por anon/PUBLIC.

-- ============================================
-- 1. create_organization_with_owner: exigir admin o service_role
-- ============================================

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
  -- SECURITY DEFINER salta la RLS de organizations, así que el control de
  -- acceso debe vivir aquí: solo service_role (scripts/edge functions) o
  -- un admin activo pueden crear organizaciones.
  IF (auth.jwt() ->> 'role') IS DISTINCT FROM 'service_role'
     AND NOT EXISTS (
       SELECT 1 FROM public.user_profiles
       WHERE user_id = auth.uid()
         AND role = 'admin'
         AND is_active = true
     ) THEN
    RAISE EXCEPTION 'Solo administradores pueden crear organizaciones';
  END IF;

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
Solo ejecutable por un admin activo o por service_role (scripts/edge functions).
Si el usuario ya existe sin organización, se actualiza a owner.
Si el usuario no tiene perfil, se crea uno como owner.';

-- ============================================
-- 2. Bloquear EXECUTE para anon/PUBLIC
-- ============================================

REVOKE EXECUTE ON FUNCTION public.create_organization_with_owner(
  TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ
) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_organization_with_owner(
  TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ
) FROM anon;
-- authenticated se mantiene: la UI de admin llama el RPC con sesión de usuario
-- y el control real es el chequeo de rol dentro de la función.
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(
  TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_with_owner(
  TEXT, TEXT, TEXT, TEXT, UUID, TEXT, TIMESTAMPTZ, TIMESTAMPTZ
) TO service_role;

-- ============================================
-- 3. prevent_role_org_change: eliminar la auto-promoción a owner
-- ============================================

-- Antes se permitía OLD.user_id = auth.uid() como vía para "crear tu propia
-- organización", pero esa vía nunca se implementó en la UI y dejaba que
-- cualquier usuario sin organización se promoviera a owner con un UPDATE
-- directo. Ahora el único camino es create_organization_with_owner (flag de
-- sesión) o ser admin/service_role.

CREATE OR REPLACE FUNCTION public.prevent_role_org_change()
RETURNS TRIGGER AS $$
BEGIN
  -- service_role (scripts, edge functions) puede cambiar cualquier cosa
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  -- Los admins pueden cambiar cualquier cosa
  IF EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN NEW;
  END IF;

  IF OLD.role IS DISTINCT FROM NEW.role OR OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
    -- Única excepción: la promoción a owner que hace create_organization_with_owner,
    -- identificada por la variable de sesión que esa función establece.
    IF OLD.organization_id IS NULL
       AND NEW.organization_id IS NOT NULL
       AND NEW.role = 'owner'::user_role
       AND current_setting('app.creating_org_with_owner', true) = 'true' THEN
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'No tienes permiso para cambiar el role u organization_id. Solo los administradores pueden hacerlo.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.prevent_role_org_change IS
'Previene que usuarios no-admin cambien su role u organization_id.
Única excepción: la promoción a owner realizada por create_organization_with_owner.';
