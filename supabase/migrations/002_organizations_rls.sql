-- Migración: Row Level Security (RLS) para organizations
-- Ejecutar en Supabase SQL Editor después de 001_auth_and_roles.sql

-- ============================================
-- 1. Habilitar RLS en organizations
-- ============================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 2. Políticas de SELECT (lectura)
-- ============================================

-- Política: Los usuarios autenticados pueden ver su propia organización
CREATE POLICY "Users can view own organization"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
        AND organization_id = organizations.id
        AND is_active = true
    )
  );

-- Política: Los admins pueden ver todas las organizaciones
CREATE POLICY "Admins can view all organizations"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
        AND role = 'admin'
        AND is_active = true
    )
  );

-- ============================================
-- 3. Políticas de INSERT (creación)
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

-- ============================================
-- 4. Políticas de UPDATE (actualización)
-- ============================================

-- Política: Los owners pueden actualizar su propia organización
CREATE POLICY "Owners can update own organization"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
        AND organization_id = organizations.id
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
        AND organization_id = organizations.id
        AND role IN ('owner', 'admin')
        AND is_active = true
    )
  );

-- Política: Los admins pueden actualizar cualquier organización
CREATE POLICY "Admins can update any organization"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
        AND role = 'admin'
        AND is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
        AND role = 'admin'
        AND is_active = true
    )
  );

-- ============================================
-- 5. Políticas de DELETE (eliminación)
-- ============================================

-- Política: Solo admins pueden eliminar organizaciones
CREATE POLICY "Admins can delete organizations"
  ON public.organizations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() 
        AND role = 'admin'
        AND is_active = true
    )
  );

-- ============================================
-- 6. Comentarios para documentación
-- ============================================

COMMENT ON POLICY "Users can view own organization" ON public.organizations IS 
  'Permite que usuarios autenticados vean la organización a la que pertenecen (según user_profiles.organization_id)';

COMMENT ON POLICY "Admins can view all organizations" ON public.organizations IS 
  'Permite que administradores globales vean todas las organizaciones';

COMMENT ON POLICY "Admins can create organizations" ON public.organizations IS 
  'Solo administradores globales pueden crear nuevas organizaciones';

COMMENT ON POLICY "Owners can update own organization" ON public.organizations IS 
  'Permite que owners y admins actualicen su propia organización';

COMMENT ON POLICY "Admins can update any organization" ON public.organizations IS 
  'Permite que administradores globales actualicen cualquier organización';

COMMENT ON POLICY "Admins can delete organizations" ON public.organizations IS 
  'Solo administradores globales pueden eliminar organizaciones';