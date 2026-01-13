-- Migración: Sistema de autenticación y roles de usuario
-- Ejecutar en Supabase SQL Editor

-- ============================================
-- 1. Tabla de perfiles de usuario con roles
-- ============================================

-- Enum para roles de usuario
CREATE TYPE user_role AS ENUM ('admin', 'owner', 'staff', 'special');

-- ============================================
-- 0. Tabla de organizaciones
-- ============================================

-- Tabla de organizaciones (debe crearse antes de user_profiles)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  slug TEXT NOT NULL UNIQUE,
  whatsapp_phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para organizaciones
CREATE INDEX idx_organizations_slug ON public.organizations(slug);

-- ============================================
-- 1. Tabla de perfiles de usuario con roles
-- ============================================

-- Tabla de perfiles de usuario
-- Se vincula con auth.users de Supabase mediante user_id
CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT,
  role user_role NOT NULL DEFAULT 'staff',
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para mejorar performance
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX idx_user_profiles_organization_id ON public.user_profiles(organization_id);
CREATE INDEX idx_user_profiles_role ON public.user_profiles(role);
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);

-- ============================================
-- 2. Función para actualizar updated_at automáticamente
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Función para prevenir que usuarios no-admin cambien su role u organization_id
CREATE OR REPLACE FUNCTION public.prevent_role_org_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Verificar si el usuario actual es admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    -- Si no es admin, no puede cambiar role ni organization_id
    IF OLD.role IS DISTINCT FROM NEW.role OR OLD.organization_id IS DISTINCT FROM NEW.organization_id THEN
      RAISE EXCEPTION 'No tienes permiso para cambiar el role u organization_id. Solo los administradores pueden hacerlo.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER prevent_role_org_change_trigger
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_org_change();

-- ============================================
-- 3. Función para crear perfil automáticamente al registrarse
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'staff'::user_role -- Por defecto staff, el admin puede cambiar después
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que se ejecuta cuando se crea un nuevo usuario en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 4. Row Level Security (RLS) para user_profiles
-- ============================================

-- Habilitar RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden ver su propio perfil
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Política: Los usuarios pueden actualizar su propio perfil (pero no role ni organization_id)
-- Nota: La restricción de no cambiar role/organization_id se maneja mediante trigger
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Política: Solo admins pueden ver todos los perfiles
CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Política: Solo admins y owners pueden crear perfiles manualmente
CREATE POLICY "Admins and owners can insert profiles"
  ON public.user_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Política: Solo admins pueden cambiar roles y organization_id
CREATE POLICY "Admins can manage roles and organizations"
  ON public.user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- 5. Función helper para obtener el rol del usuario actual
-- ============================================

CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid UUID DEFAULT auth.uid())
RETURNS user_role AS $$
  SELECT role FROM public.user_profiles WHERE user_id = user_uuid;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 6. Función helper para verificar si el usuario es admin/owner
-- ============================================

CREATE OR REPLACE FUNCTION public.is_admin_or_owner(user_uuid UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = user_uuid AND role IN ('admin', 'owner') AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================
-- 7. Comentarios para documentación
-- ============================================

COMMENT ON TABLE public.organizations IS 'Organizaciones o negocios que utilizan el sistema de turnos';
COMMENT ON COLUMN public.organizations.slug IS 'Identificador único para URLs (ej: mi-negocio)';
COMMENT ON COLUMN public.organizations.timezone IS 'Zona horaria de la organización (ej: America/Argentina/Buenos_Aires)';
COMMENT ON TABLE public.user_profiles IS 'Perfiles de usuario con roles y organización asociada';
COMMENT ON COLUMN public.user_profiles.role IS 'Rol del usuario: admin (acceso total), owner (dueño del negocio), staff (empleado normal), special (permisos especiales)';
COMMENT ON COLUMN public.user_profiles.organization_id IS 'ID de la organización a la que pertenece el usuario (NULL para admins globales)';
COMMENT ON TYPE user_role IS 'Roles disponibles: admin (administrador global), owner (dueño), staff (empleado), special (permisos especiales)';
