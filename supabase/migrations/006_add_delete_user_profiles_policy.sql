-- Migración: Agregar política RLS para que admins puedan eliminar usuarios
-- Ejecutar en Supabase SQL Editor
-- 
-- Esta migración permite que los administradores eliminen perfiles de usuario.
-- Nota: Al eliminar un perfil, el usuario en auth.users NO se elimina automáticamente.
-- Si necesitas eliminar también el usuario de auth.users, necesitarás usar el Admin API
-- o crear una función Edge Function.

-- Política: Solo admins pueden eliminar perfiles
CREATE POLICY "admins_delete_profiles"
  ON public.user_profiles
  FOR DELETE
  USING (public.is_admin_or_owner_check());

-- Comentario para documentación
COMMENT ON POLICY "admins_delete_profiles" ON public.user_profiles IS 
'Solo administradores pueden eliminar perfiles de usuario. El usuario en auth.users no se elimina automáticamente.';
