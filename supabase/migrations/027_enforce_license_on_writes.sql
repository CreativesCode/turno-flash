-- Migración: Bloquear escrituras cuando la licencia/trial de la organización expiró
-- Ejecutar después de 026_secure_org_creation.sql
--
-- Contexto:
-- El bloqueo por licencia vencida vivía SOLO en el cliente (pantalla del home
-- del dashboard). Las subrutas no lo aplicaban y, sobre todo, no había
-- enforcement en el servidor: con el token del usuario se podían crear/editar
-- turnos, clientes, servicios, etc. vía API aunque el trial estuviera vencido.
--
-- Esta migración agrega enforcement REAL en la base: las escrituras
-- (INSERT/UPDATE/DELETE) de las tablas operativas se rechazan cuando la licencia
-- de la organización no es usable. Las LECTURAS quedan intactas (la app pasa a
-- modo solo-lectura), y el service_role (edge functions, triggers) no se ve
-- afectado porque omite RLS.

-- ============================================
-- 1. Helper: ¿la licencia de la organización es usable?
-- ============================================

-- Reusa check_license_status (migración 008). Fail-closed: si no se puede
-- determinar el estado, devuelve false. El período de gracia (7 días) coincide
-- con el default del cliente (NEXT_PUBLIC_LICENSE_GRACE_PERIOD_DAYS).
CREATE OR REPLACE FUNCTION public.org_license_usable(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT ls.is_usable FROM public.check_license_status(p_org_id, 7) ls),
    false
  );
$$;

COMMENT ON FUNCTION public.org_license_usable IS
'Devuelve true si la organización puede operar (licencia activa o en período de
gracia de 7 días). Fail-closed. Usada en las políticas RLS de escritura para
bloquear operaciones cuando el trial/licencia expiró.';

REVOKE EXECUTE ON FUNCTION public.org_license_usable(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.org_license_usable(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.org_license_usable(UUID) TO service_role;

-- ============================================
-- 2. Recrear las políticas de ESCRITURA con el guard de licencia
-- ============================================
-- Patrón: cada política "manage" (FOR ALL) se recrea agregando
-- public.org_license_usable(<org>) tanto a USING como a WITH CHECK. Las
-- políticas "view" (FOR SELECT) NO se tocan, así las lecturas siguen abiertas.

-- service_categories (admin/owner)
DROP POLICY IF EXISTS "Users can manage service categories of their org" ON public.service_categories;
CREATE POLICY "Users can manage service categories of their org"
ON public.service_categories FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
  AND public.org_license_usable(organization_id)
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
  AND public.org_license_usable(organization_id)
);

-- services (admin/owner)
DROP POLICY IF EXISTS "Users can manage services of their org" ON public.services;
CREATE POLICY "Users can manage services of their org"
ON public.services FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
  AND public.org_license_usable(organization_id)
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
  AND public.org_license_usable(organization_id)
);

-- staff_members (admin/owner)
DROP POLICY IF EXISTS "Users can manage staff of their org" ON public.staff_members;
CREATE POLICY "Users can manage staff of their org"
ON public.staff_members FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
  AND public.org_license_usable(organization_id)
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
  AND public.org_license_usable(organization_id)
);

-- staff_services (admin/owner, vía staff_id → organization)
DROP POLICY IF EXISTS "Users can manage staff services of their org" ON public.staff_services;
CREATE POLICY "Users can manage staff services of their org"
ON public.staff_services FOR ALL
USING (
  staff_id IN (
    SELECT id FROM public.staff_members
    WHERE organization_id IN (
      SELECT organization_id FROM public.user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
    AND public.org_license_usable(organization_id)
  )
)
WITH CHECK (
  staff_id IN (
    SELECT id FROM public.staff_members
    WHERE organization_id IN (
      SELECT organization_id FROM public.user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
    AND public.org_license_usable(organization_id)
  )
);

-- staff_availability (admin/owner, vía staff_id → organization)
DROP POLICY IF EXISTS "Users can manage staff availability of their org" ON public.staff_availability;
CREATE POLICY "Users can manage staff availability of their org"
ON public.staff_availability FOR ALL
USING (
  staff_id IN (
    SELECT id FROM public.staff_members
    WHERE organization_id IN (
      SELECT organization_id FROM public.user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
    AND public.org_license_usable(organization_id)
  )
)
WITH CHECK (
  staff_id IN (
    SELECT id FROM public.staff_members
    WHERE organization_id IN (
      SELECT organization_id FROM public.user_profiles
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
    AND public.org_license_usable(organization_id)
  )
);

-- staff_exceptions (admin/owner)
DROP POLICY IF EXISTS "Users can manage staff exceptions of their org" ON public.staff_exceptions;
CREATE POLICY "Users can manage staff exceptions of their org"
ON public.staff_exceptions FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
  AND public.org_license_usable(organization_id)
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
  )
  AND public.org_license_usable(organization_id)
);

-- customers (cualquier miembro de la org)
DROP POLICY IF EXISTS "Users can manage customers of their org" ON public.customers;
CREATE POLICY "Users can manage customers of their org"
ON public.customers FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
  AND public.org_license_usable(organization_id)
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
  AND public.org_license_usable(organization_id)
);

-- appointments (cualquier miembro de la org)
DROP POLICY IF EXISTS "Users can manage appointments of their org" ON public.appointments;
CREATE POLICY "Users can manage appointments of their org"
ON public.appointments FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
  AND public.org_license_usable(organization_id)
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
  AND public.org_license_usable(organization_id)
);

-- appointment_requests (cualquier miembro de la org)
DROP POLICY IF EXISTS "Users can manage appointment requests of their org" ON public.appointment_requests;
CREATE POLICY "Users can manage appointment requests of their org"
ON public.appointment_requests FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
  AND public.org_license_usable(organization_id)
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
  AND public.org_license_usable(organization_id)
);

-- waitlist (cualquier miembro de la org)
DROP POLICY IF EXISTS "Users can manage waitlist of their org" ON public.waitlist;
CREATE POLICY "Users can manage waitlist of their org"
ON public.waitlist FOR ALL
USING (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
  AND public.org_license_usable(organization_id)
)
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.user_profiles WHERE user_id = auth.uid()
  )
  AND public.org_license_usable(organization_id)
);

-- Nota: business_settings, notifications, reminder_logs y customer_history NO se
-- bloquean. Los settings deben seguir accesibles (no son operación de negocio) y
-- las otras tres las escriben triggers/edge functions (service_role), que omiten
-- RLS de todos modos.
