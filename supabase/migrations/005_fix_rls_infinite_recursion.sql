-- Migración: Arreglar recursión infinita en políticas RLS de user_profiles
-- 
-- PROBLEMA: Las políticas RLS que verifican si el usuario es admin/owner
-- consultan la tabla user_profiles, pero para consultar esa tabla se necesitan
-- verificar las políticas, causando recursión infinita.
--
-- SOLUCIÓN: Usar funciones SECURITY DEFINER que pueden bypass RLS para
-- verificar el rol del usuario.

-- ============================================
-- 1. Eliminar políticas problemáticas
-- ============================================

DROP POLICY IF EXISTS "users_select_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "admins_select_all_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "admins_update_all_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "admins_insert_profiles" ON public.user_profiles;

-- ============================================
-- 2. Eliminar funciones existentes con conflictos
-- ============================================

-- Eliminar todas las versiones de is_admin_or_owner
DROP FUNCTION IF EXISTS public.is_admin_or_owner();
DROP FUNCTION IF EXISTS public.is_admin_or_owner(UUID);
DROP FUNCTION IF EXISTS public.auth_user_role();
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.get_user_role(UUID);

-- ============================================
-- 3. Crear función helper para verificar rol (bypass RLS)
-- ============================================

-- Esta función usa SECURITY DEFINER para ejecutarse con permisos elevados
-- y poder consultar la tabla sin pasar por RLS
CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::TEXT FROM public.user_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

-- Función para verificar si el usuario actual es admin u owner
CREATE OR REPLACE FUNCTION public.is_admin_or_owner_check()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
    AND is_active = true
  );
$$;

-- ============================================
-- 4. Crear nuevas políticas RLS (sin recursión)
-- ============================================

-- Política 1: Usuarios pueden ver su propio perfil
-- Esta es segura porque solo compara auth.uid() con user_id (no consulta la tabla)
CREATE POLICY "users_select_own_profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política 2: Admins/Owners pueden ver todos los perfiles
-- Usa la función SECURITY DEFINER que bypassa RLS
CREATE POLICY "admins_select_all_profiles"
  ON public.user_profiles
  FOR SELECT
  USING (public.is_admin_or_owner_check());

-- Política 3: Usuarios pueden actualizar su propio perfil
CREATE POLICY "users_update_own_profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política 4: Admins pueden actualizar cualquier perfil
CREATE POLICY "admins_update_all_profiles"
  ON public.user_profiles
  FOR UPDATE
  USING (public.is_admin_or_owner_check());

-- Política 5: Admins/Owners pueden insertar perfiles manualmente
-- (El trigger de registro automático usa SECURITY DEFINER y bypassa esto)
CREATE POLICY "admins_insert_profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (public.is_admin_or_owner_check());

-- ============================================
-- 5. Comentarios para documentación
-- ============================================

COMMENT ON FUNCTION public.auth_user_role() IS 
'Obtiene el rol del usuario actual. Usa SECURITY DEFINER para bypass RLS y evitar recursión infinita.';

COMMENT ON FUNCTION public.is_admin_or_owner_check() IS 
'Verifica si el usuario actual es admin u owner. Usa SECURITY DEFINER para bypass RLS y evitar recursión infinita.';

-- ============================================
-- 6. Verificación (ejecutar manualmente para debug)
-- ============================================

-- Para verificar que las políticas están correctas:
-- SELECT * FROM pg_policies WHERE tablename = 'user_profiles';

-- Para probar la función:
-- SELECT public.auth_user_role();
-- SELECT public.is_admin_or_owner_check();
