-- Migración: Permitir que el trigger bypass RLS para crear perfiles
-- 
-- PROBLEMA: El trigger handle_new_user() falla porque las políticas RLS
-- bloquean la inserción. Durante el registro inicial, el contexto de auth.uid()
-- no está disponible para las políticas RLS.
--
-- SOLUCIÓN: Otorgar permiso directo de INSERT al rol del servicio (service_role)
-- y hacer que la función se ejecute con esos privilegios usando SECURITY DEFINER.

-- Eliminar el trigger y función anteriores
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Eliminar políticas anteriores
DROP POLICY IF EXISTS "Admins and owners can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

-- Deshabilitar temporalmente RLS para verificar la estructura
-- (Esto es solo para debug, se volverá a habilitar)
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Habilitar RLS nuevamente
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- SOLUCIÓN: Crear la función sin verificaciones RLS
-- Al usar SECURITY DEFINER, la función se ejecuta con los permisos del dueño
-- de la función (el rol postgres/supabase_admin), que puede bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  new_profile_id UUID;
BEGIN
  -- Intentar insertar el perfil
  INSERT INTO public.user_profiles (user_id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'staff'::user_role,
    true
  )
  RETURNING id INTO new_profile_id;
  
  -- Log exitoso (visible en logs de Supabase)
  RAISE NOTICE 'Profile created successfully for user %: profile_id=%', NEW.id, new_profile_id;
  
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

-- Crear el trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Otorgar permisos explícitos para que la función pueda insertar
-- GRANT INSERT ON public.user_profiles TO authenticator;
-- GRANT INSERT ON public.user_profiles TO service_role;

-- Recrear políticas RLS más permisivas

-- Política 1: Usuarios pueden ver su propio perfil
CREATE POLICY "users_select_own_profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política 2: Admins pueden ver todos los perfiles
CREATE POLICY "admins_select_all_profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'owner')
      AND up.is_active = true
    )
  );

-- Política 3: Usuarios pueden actualizar su propio perfil
-- (pero no role ni organization_id, eso lo controla el trigger prevent_role_org_change)
CREATE POLICY "users_update_own_profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política 4: Admins pueden actualizar cualquier perfil
CREATE POLICY "admins_update_all_profiles"
  ON public.user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role = 'admin'
      AND up.is_active = true
    )
  );

-- Política 5: Solo admins pueden insertar perfiles manualmente
-- (El trigger bypass RLS automáticamente con SECURITY DEFINER)
CREATE POLICY "admins_insert_profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid() 
      AND up.role IN ('admin', 'owner')
      AND up.is_active = true
    )
  );

-- Comentarios para documentación
COMMENT ON FUNCTION public.handle_new_user() IS 
'Crea automáticamente un perfil cuando se registra un nuevo usuario. 
Usa SECURITY DEFINER para ejecutarse con permisos elevados y bypass RLS.
Incluye manejo de errores para no fallar el proceso de registro.';

COMMENT ON POLICY "users_select_own_profile" ON public.user_profiles IS 
'Permite que los usuarios vean su propio perfil';

COMMENT ON POLICY "admins_insert_profiles" ON public.user_profiles IS 
'Solo admins pueden crear perfiles manualmente. El trigger de registro automático bypass esta política.';
