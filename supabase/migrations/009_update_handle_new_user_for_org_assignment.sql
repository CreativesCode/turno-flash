-- Migración: Actualizar handle_new_user para asignar organización desde metadata
-- Ejecutar después de 008_add_license_management.sql
--
-- Cambios:
-- 1. Actualizar handle_new_user para leer invited_to_organization_id de metadata
-- 2. Asignar automáticamente la organización al usuario invitado

-- ============================================
-- 1. Actualizar función handle_new_user
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_profile_id UUID;
  org_id UUID;
BEGIN
  -- Leer organization_id de metadata si existe
  -- Esto se establece cuando un owner/admin invita a un usuario a su organización
  IF NEW.raw_user_meta_data->>'invited_to_organization_id' IS NOT NULL THEN
    org_id := (NEW.raw_user_meta_data->>'invited_to_organization_id')::UUID;
  END IF;

  -- Crear el perfil con organization_id si está disponible
  INSERT INTO public.user_profiles (
    user_id, 
    email, 
    full_name, 
    role, 
    organization_id,
    is_active
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'staff'::user_role,
    org_id,
    true
  )
  RETURNING id INTO new_profile_id;
  
  -- Log exitoso
  IF org_id IS NOT NULL THEN
    RAISE NOTICE 'Profile created for user % with organization_id=%: profile_id=%', NEW.id, org_id, new_profile_id;
  ELSE
    RAISE NOTICE 'Profile created for user % (no organization): profile_id=%', NEW.id, new_profile_id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- El perfil ya existe, no es un error crítico
    RAISE WARNING 'Profile already exists for user %', NEW.id;
    RETURN NEW;
  WHEN OTHERS THEN
    -- Cualquier otro error, loguear pero no fallar el registro
    RAISE WARNING 'Error creating user profile for %: % - %', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.handle_new_user IS 
'Crea un perfil de usuario automáticamente cuando se crea un nuevo usuario.
Si el usuario fue invitado a una organización (invited_to_organization_id en metadata),
asigna automáticamente esa organización al perfil.';
