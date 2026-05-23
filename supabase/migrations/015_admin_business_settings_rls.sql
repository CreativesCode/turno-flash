-- Migración: Permitir al admin gestionar business_settings de CUALQUIER organización
--
-- Problema que resuelve: la policy "Owners can manage business settings" en la
-- migración 010 solo deja editar las business_settings a usuarios que pertenecen
-- a esa misma organización (vía user_profiles). El admin de la plataforma no
-- pertenece a las orgs de los clientes → no podía guardar la config WA desde
-- el panel de detalles de organización.

CREATE POLICY "Admins can manage any business_settings"
ON public.business_settings
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

COMMENT ON POLICY "Admins can manage any business_settings" ON public.business_settings
  IS 'Permite al admin de la plataforma crear/editar/borrar business_settings de cualquier organización (necesario para configurar la integración WhatsApp desde el panel de detalles de organización).';
