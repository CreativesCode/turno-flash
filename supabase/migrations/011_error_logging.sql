-- Migración: Sistema de Logging de Errores
-- TurnoFlash - Error Tracking con Supabase
-- Ejecutar después de 010_appointment_system.sql

-- ============================================
-- 1. TABLA DE ERROR LOGS
-- ============================================

CREATE TABLE IF NOT EXISTS error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_message TEXT NOT NULL,
  error_stack TEXT,
  component_stack TEXT,
  user_agent TEXT,
  url TEXT,
  context JSONB, -- Contexto adicional como JSON
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes TEXT,
  error_count INTEGER DEFAULT 1, -- Contador de ocurrencias del mismo error
  last_occurrence TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. ÍNDICES PARA BÚSQUEDAS RÁPIDAS
-- ============================================

CREATE INDEX idx_error_logs_timestamp ON error_logs(timestamp DESC);
CREATE INDEX idx_error_logs_resolved ON error_logs(resolved);
CREATE INDEX idx_error_logs_organization ON error_logs(organization_id);
CREATE INDEX idx_error_logs_user ON error_logs(user_id);
CREATE INDEX idx_error_logs_message ON error_logs USING gin(to_tsvector('english', error_message));
CREATE INDEX idx_error_logs_url ON error_logs(url) WHERE url IS NOT NULL;

-- ============================================
-- 3. FUNCIÓN PARA AGREGAR ERRORES DUPLICADOS
-- ============================================

-- Función que incrementa el contador si el error ya existe
CREATE OR REPLACE FUNCTION increment_error_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Buscar si existe un error similar (mismo mensaje y URL) en las últimas 24 horas
  UPDATE error_logs
  SET 
    error_count = error_count + 1,
    last_occurrence = NOW()
  WHERE 
    error_message = NEW.error_message
    AND (url = NEW.url OR (url IS NULL AND NEW.url IS NULL))
    AND timestamp > NOW() - INTERVAL '24 hours'
    AND resolved = FALSE
    AND id != NEW.id
  RETURNING id INTO NEW.id;
  
  -- Si no se encontró un error similar, insertar nuevo
  IF NEW.id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Retornar NULL para evitar la inserción duplicada
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para evitar duplicados
CREATE TRIGGER prevent_duplicate_errors
BEFORE INSERT ON error_logs
FOR EACH ROW
EXECUTE FUNCTION increment_error_count();

-- ============================================
-- 4. ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE error_logs ENABLE ROW LEVEL SECURITY;

-- Política: Cualquier usuario autenticado puede insertar errores
CREATE POLICY "Users can insert error logs"
  ON error_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política: Solo admins y owners pueden ver errores de su organización
CREATE POLICY "Admins can view error logs"
  ON error_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'owner')
      AND (
        -- Pueden ver errores de su organización
        error_logs.organization_id = user_profiles.organization_id
        -- O errores sin organización asignada (errores globales)
        OR error_logs.organization_id IS NULL
      )
    )
  );

-- Política: Solo admins y owners pueden actualizar errores (marcar como resueltos)
CREATE POLICY "Admins can update error logs"
  ON error_logs FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'owner')
      AND (
        error_logs.organization_id = user_profiles.organization_id
        OR error_logs.organization_id IS NULL
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role IN ('admin', 'owner')
      AND (
        error_logs.organization_id = user_profiles.organization_id
        OR error_logs.organization_id IS NULL
      )
    )
  );

-- ============================================
-- 5. FUNCIÓN HELPER PARA ESTADÍSTICAS
-- ============================================

-- Función para obtener estadísticas de errores
CREATE OR REPLACE FUNCTION get_error_stats(
  p_organization_id UUID DEFAULT NULL,
  p_days INTEGER DEFAULT 7
)
RETURNS TABLE (
  total_errors BIGINT,
  unresolved_errors BIGINT,
  resolved_errors BIGINT,
  unique_errors BIGINT,
  most_common_error TEXT,
  errors_today BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_errors,
    COUNT(*) FILTER (WHERE resolved = FALSE)::BIGINT as unresolved_errors,
    COUNT(*) FILTER (WHERE resolved = TRUE)::BIGINT as resolved_errors,
    COUNT(DISTINCT error_message)::BIGINT as unique_errors,
    (SELECT error_message 
     FROM error_logs 
     WHERE (p_organization_id IS NULL OR organization_id = p_organization_id)
       AND timestamp > NOW() - (p_days || ' days')::INTERVAL
     GROUP BY error_message 
     ORDER BY SUM(error_count) DESC 
     LIMIT 1) as most_common_error,
    COUNT(*) FILTER (WHERE timestamp::DATE = CURRENT_DATE)::BIGINT as errors_today
  FROM error_logs
  WHERE (p_organization_id IS NULL OR organization_id = p_organization_id)
    AND timestamp > NOW() - (p_days || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. COMENTARIOS EN LA TABLA
-- ============================================

COMMENT ON TABLE error_logs IS 'Registro de errores de la aplicación para monitoreo y debugging';
COMMENT ON COLUMN error_logs.error_count IS 'Número de veces que ha ocurrido este error (agregado automáticamente)';
COMMENT ON COLUMN error_logs.context IS 'Contexto adicional del error en formato JSON';
COMMENT ON COLUMN error_logs.resolution_notes IS 'Notas sobre cómo se resolvió el error';
