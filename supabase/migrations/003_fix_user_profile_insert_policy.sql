-- Migración: Corregir política RLS para permitir creación automática de perfiles
-- Ejecutar en Supabase SQL Editor
-- 
-- PROBLEMA: La política "Admins and owners can insert profiles" bloqueaba
-- la creación automática de perfiles cuando un nuevo usuario se registra,
-- porque requiere que el usuario ya tenga un perfil con rol admin/owner.
--
-- SOLUCIÓN: Agregar una política adicional que permita que los usuarios creen su
-- propio perfil durante el registro (cuando user_id = auth.uid()).
-- Las políticas RLS se evalúan con OR, así que esta nueva política permitirá
-- el registro automático sin afectar la política existente para admins.

-- Eliminar políticas existentes si ya fueron creadas (para permitir re-ejecutar esta migración)
DROP POLICY IF EXISTS "Admins and owners can insert profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Política: Permitir que usuarios creen su propio perfil (para el trigger automático)
-- Esta política permite que el trigger handle_new_user() pueda crear perfiles
-- cuando un nuevo usuario se registra por primera vez
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Política: Permitir que admins y owners creen perfiles para otros usuarios
-- (Recreamos la política original pero solo para casos donde el usuario ya existe)
CREATE POLICY "Admins and owners can insert profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner') AND is_active = true
    )
  );
