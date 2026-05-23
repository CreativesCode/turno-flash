-- Migración: Habilitar Supabase Realtime para tablas core operativas
-- Tablas: appointments, customers, services, staff_members, wa_outbound_messages
--
-- Notas:
--   - REPLICA IDENTITY FULL: necesario para que los eventos DELETE/UPDATE traigan
--     el row completo (no sólo la PK). Crítico para poder filtrar por
--     organization_id en el cliente y para hacer cache patching futuro.
--   - Las tablas se añaden a la publicación `supabase_realtime` que Supabase
--     crea por defecto. Los clientes que se suscriban respetan las políticas
--     RLS existentes automáticamente.
--
-- Idempotente: usa DO blocks para evitar errores si ya están en la publicación.

-- ============================================
-- 1. REPLICA IDENTITY FULL
-- ============================================

ALTER TABLE public.appointments REPLICA IDENTITY FULL;
ALTER TABLE public.customers REPLICA IDENTITY FULL;
ALTER TABLE public.services REPLICA IDENTITY FULL;
ALTER TABLE public.staff_members REPLICA IDENTITY FULL;
ALTER TABLE public.wa_outbound_messages REPLICA IDENTITY FULL;

-- ============================================
-- 2. AÑADIR A PUBLICACIÓN supabase_realtime
-- ============================================

DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'appointments',
    'customers',
    'services',
    'staff_members',
    'wa_outbound_messages'
  ];
BEGIN
  -- Crear publicación si no existe (en Supabase ya viene creada, defensivo)
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 3. COMENTARIOS
-- ============================================

COMMENT ON PUBLICATION supabase_realtime IS
  'Publicación usada por Supabase Realtime. Incluye tablas operativas core de TurnoFlash.';
