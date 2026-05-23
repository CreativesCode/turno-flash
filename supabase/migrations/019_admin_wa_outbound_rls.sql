-- Migración: permitir al admin leer los envíos WhatsApp de cualquier organización.
--
-- Misma razón que la migración 015: el admin de la plataforma no pertenece a
-- las orgs de los clientes, y la policy "Users can view wa outbound of their org"
-- de la migración 014 le bloquea la lectura. Sin esto, la tabla "Últimos 20 envíos"
-- en la sección WhatsApp de los detalles de organización aparece vacía aunque
-- haya mensajes registrados.

CREATE POLICY "Admins can view any wa_outbound_messages"
ON public.wa_outbound_messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

COMMENT ON POLICY "Admins can view any wa_outbound_messages" ON public.wa_outbound_messages
  IS 'Permite al admin de la plataforma ver los envíos WhatsApp de cualquier organización desde el panel de detalles.';
