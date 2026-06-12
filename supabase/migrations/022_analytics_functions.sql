-- Migración: Funciones de analítica para dashboards
-- Ejecutar después de 021_revenuecat_subscriptions.sql
--
-- Ver docs/PLAN-DASHBOARDS-Y-MEJORAS.md (Fase 1).
--
-- 1. get_organization_analytics(): métricas de una organización para el
--    dashboard de reportes (/dashboard/reports). owner = su org; admin = cualquiera.
-- 2. get_admin_platform_stats(): métricas globales de la plataforma para el
--    dashboard de admin (/dashboard/platform). Solo admin.
--
-- Ambas devuelven un único JSONB agregado en Postgres (1 round-trip, sin
-- descargar filas crudas al cliente) y verifican el rol internamente
-- (SECURITY DEFINER, mismo patrón que get_my_organization_license_status).
--
-- Convención de ingresos:
--   ingreso por turno = COALESCE(price_charged, services.price, 0)
--   revenue       = turnos completados
--   revenue_paid  = turnos completados con was_paid = true
--   revenue_lost  = turnos cancelados o no_show

-- ============================================
-- 1. Analítica de una organización
-- ============================================

CREATE OR REPLACE FUNCTION public.get_organization_analytics(
  p_start_date DATE,
  p_end_date DATE,
  p_organization_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_profile_org UUID;
  v_org UUID;
  v_days INTEGER;
  v_prev_start DATE;
  v_prev_end DATE;
BEGIN
  SELECT up.role::TEXT, up.organization_id
  INTO v_role, v_profile_org
  FROM public.user_profiles up
  WHERE up.user_id = auth.uid() AND up.is_active = true;

  IF v_role IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF v_role = 'admin' THEN
    v_org := COALESCE(p_organization_id, v_profile_org);
  ELSIF v_role = 'owner' THEN
    v_org := v_profile_org;
  ELSE
    RAISE EXCEPTION 'Solo dueños y administradores pueden ver reportes';
  END IF;

  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Organización no especificada';
  END IF;

  IF p_end_date < p_start_date THEN
    RAISE EXCEPTION 'Rango de fechas inválido';
  END IF;

  v_days := (p_end_date - p_start_date) + 1;
  IF v_days > 400 THEN
    RAISE EXCEPTION 'El rango máximo es de 400 días';
  END IF;

  -- Período anterior de la misma duración, inmediatamente antes (para deltas)
  v_prev_end := p_start_date - 1;
  v_prev_start := v_prev_end - (v_days - 1);

  RETURN jsonb_build_object(
    'organization_id', v_org,
    'start_date', p_start_date,
    'end_date', p_end_date,

    'summary', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'completed', COUNT(*) FILTER (WHERE a.status = 'completed'),
        'cancelled', COUNT(*) FILTER (WHERE a.status = 'cancelled'),
        'no_show', COUNT(*) FILTER (WHERE a.status = 'no_show'),
        'revenue', COALESCE(SUM(COALESCE(a.price_charged, s.price, 0)) FILTER (WHERE a.status = 'completed'), 0),
        'revenue_paid', COALESCE(SUM(COALESCE(a.price_charged, s.price, 0)) FILTER (WHERE a.status = 'completed' AND a.was_paid), 0),
        'revenue_lost', COALESCE(SUM(COALESCE(a.price_charged, s.price, 0)) FILTER (WHERE a.status IN ('cancelled', 'no_show')), 0),
        'avg_rating', ROUND(AVG(a.rating) FILTER (WHERE a.rating IS NOT NULL), 2),
        'ratings_count', COUNT(*) FILTER (WHERE a.rating IS NOT NULL),
        'unique_customers', COUNT(DISTINCT a.customer_id),
        'new_customers', (
          SELECT COUNT(*) FROM public.customers c
          WHERE c.organization_id = v_org
            AND c.created_at::date BETWEEN p_start_date AND p_end_date
        )
      )
      FROM public.appointments a
      JOIN public.services s ON s.id = a.service_id
      WHERE a.organization_id = v_org
        AND a.appointment_date BETWEEN p_start_date AND p_end_date
    ),

    'previous', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'completed', COUNT(*) FILTER (WHERE a.status = 'completed'),
        'cancelled', COUNT(*) FILTER (WHERE a.status = 'cancelled'),
        'no_show', COUNT(*) FILTER (WHERE a.status = 'no_show'),
        'revenue', COALESCE(SUM(COALESCE(a.price_charged, s.price, 0)) FILTER (WHERE a.status = 'completed'), 0),
        'unique_customers', COUNT(DISTINCT a.customer_id),
        'new_customers', (
          SELECT COUNT(*) FROM public.customers c
          WHERE c.organization_id = v_org
            AND c.created_at::date BETWEEN v_prev_start AND v_prev_end
        )
      )
      FROM public.appointments a
      JOIN public.services s ON s.id = a.service_id
      WHERE a.organization_id = v_org
        AND a.appointment_date BETWEEN v_prev_start AND v_prev_end
    ),

    'revenue_by_day', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'day', to_char(d.day, 'YYYY-MM-DD'),
          'revenue', COALESCE(x.revenue, 0),
          'appointments', COALESCE(x.cnt, 0)
        ) ORDER BY d.day
      ), '[]'::jsonb)
      FROM generate_series(p_start_date, p_end_date, interval '1 day') AS d(day)
      LEFT JOIN (
        SELECT a.appointment_date AS day,
               COALESCE(SUM(COALESCE(a.price_charged, s.price, 0)) FILTER (WHERE a.status = 'completed'), 0) AS revenue,
               COUNT(*) AS cnt
        FROM public.appointments a
        JOIN public.services s ON s.id = a.service_id
        WHERE a.organization_id = v_org
          AND a.appointment_date BETWEEN p_start_date AND p_end_date
        GROUP BY a.appointment_date
      ) x ON x.day = d.day::date
    ),

    'status_counts', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('status', t.status, 'count', t.cnt) ORDER BY t.cnt DESC
      ), '[]'::jsonb)
      FROM (
        SELECT a.status::TEXT AS status, COUNT(*) AS cnt
        FROM public.appointments a
        WHERE a.organization_id = v_org
          AND a.appointment_date BETWEEN p_start_date AND p_end_date
        GROUP BY a.status
      ) t
    ),

    'source_counts', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('source', t.source, 'count', t.cnt) ORDER BY t.cnt DESC
      ), '[]'::jsonb)
      FROM (
        SELECT COALESCE(a.source::TEXT, 'admin') AS source, COUNT(*) AS cnt
        FROM public.appointments a
        WHERE a.organization_id = v_org
          AND a.appointment_date BETWEEN p_start_date AND p_end_date
        GROUP BY 1
      ) t
    ),

    'top_services', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'name', t.name,
          'appointments', t.cnt,
          'revenue', t.revenue
        ) ORDER BY t.revenue DESC, t.cnt DESC
      ), '[]'::jsonb)
      FROM (
        SELECT s.name,
               COUNT(*) AS cnt,
               COALESCE(SUM(COALESCE(a.price_charged, s.price, 0)) FILTER (WHERE a.status = 'completed'), 0) AS revenue
        FROM public.appointments a
        JOIN public.services s ON s.id = a.service_id
        WHERE a.organization_id = v_org
          AND a.appointment_date BETWEEN p_start_date AND p_end_date
        GROUP BY s.id, s.name
        ORDER BY revenue DESC, cnt DESC
        LIMIT 8
      ) t
    ),

    'top_staff', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'name', t.name,
          'appointments', t.cnt,
          'revenue', t.revenue,
          'avg_rating', t.avg_rating
        ) ORDER BY t.revenue DESC, t.cnt DESC
      ), '[]'::jsonb)
      FROM (
        SELECT COALESCE(st.nickname, st.first_name || ' ' || st.last_name) AS name,
               COUNT(*) AS cnt,
               COALESCE(SUM(COALESCE(a.price_charged, s.price, 0)) FILTER (WHERE a.status = 'completed'), 0) AS revenue,
               ROUND(AVG(a.rating) FILTER (WHERE a.rating IS NOT NULL), 2) AS avg_rating
        FROM public.appointments a
        JOIN public.services s ON s.id = a.service_id
        JOIN public.staff_members st ON st.id = a.staff_id
        WHERE a.organization_id = v_org
          AND a.appointment_date BETWEEN p_start_date AND p_end_date
        GROUP BY st.id, st.nickname, st.first_name, st.last_name
        ORDER BY revenue DESC, cnt DESC
        LIMIT 8
      ) t
    ),

    -- Horas pico: día de la semana (0=domingo) × hora de inicio
    'heatmap', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('dow', t.dow, 'hour', t.hour, 'count', t.cnt)
      ), '[]'::jsonb)
      FROM (
        SELECT EXTRACT(DOW FROM a.appointment_date)::INT AS dow,
               EXTRACT(HOUR FROM a.start_time)::INT AS hour,
               COUNT(*) AS cnt
        FROM public.appointments a
        WHERE a.organization_id = v_org
          AND a.appointment_date BETWEEN p_start_date AND p_end_date
          AND a.status <> 'cancelled'
        GROUP BY 1, 2
      ) t
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_organization_analytics IS
'Métricas agregadas de una organización para el dashboard de reportes.
owner: solo su organización. admin: cualquier organización (p_organization_id).
Incluye el período anterior de la misma duración para calcular deltas.';

REVOKE EXECUTE ON FUNCTION public.get_organization_analytics FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_organization_analytics FROM anon;
GRANT EXECUTE ON FUNCTION public.get_organization_analytics TO authenticated;

-- ============================================
-- 2. Estadísticas globales de la plataforma (solo admin)
-- ============================================

CREATE OR REPLACE FUNCTION public.get_admin_platform_stats()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  SELECT up.role::TEXT INTO v_role
  FROM public.user_profiles up
  WHERE up.user_id = auth.uid() AND up.is_active = true;

  IF v_role IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Solo administradores pueden ver estadísticas de la plataforma';
  END IF;

  RETURN jsonb_build_object(
    'generated_at', v_now,

    'orgs', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'active', COUNT(*) FILTER (WHERE o.is_active),
        'license_active', COUNT(*) FILTER (WHERE o.license_end_date >= v_now),
        'license_grace', COUNT(*) FILTER (
          WHERE o.license_end_date < v_now
            AND o.license_end_date >= v_now - interval '7 days'
        ),
        'license_expired', COUNT(*) FILTER (WHERE o.license_end_date < v_now - interval '7 days'),
        'license_none', COUNT(*) FILTER (WHERE o.license_end_date IS NULL)
      )
      FROM public.organizations o
    ),

    -- Licencias que vencen en los próximos 30 días (para contactar antes del corte)
    'expiring_soon', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', o.id,
          'name', o.name,
          'license_end_date', o.license_end_date,
          'subscription_platform', o.subscription_platform,
          'subscription_status', o.subscription_status
        ) ORDER BY o.license_end_date
      ), '[]'::jsonb)
      FROM public.organizations o
      WHERE o.license_end_date BETWEEN v_now AND v_now + interval '30 days'
    ),

    'subscriptions', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('status', t.subscription_status, 'platform', t.subscription_platform, 'count', t.cnt)
      ), '[]'::jsonb)
      FROM (
        SELECT o.subscription_status, o.subscription_platform, COUNT(*) AS cnt
        FROM public.organizations o
        WHERE o.subscription_status IS NOT NULL
        GROUP BY 1, 2
      ) t
    ),

    'subscription_events_30d', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('event_type', t.event_type, 'count', t.cnt) ORDER BY t.cnt DESC
      ), '[]'::jsonb)
      FROM (
        SELECT se.event_type, COUNT(*) AS cnt
        FROM public.subscription_events se
        WHERE se.created_at >= v_now - interval '30 days'
        GROUP BY se.event_type
      ) t
    ),

    -- Turnos e ingresos por mes en toda la plataforma (últimos 6 meses)
    'appointments_by_month', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('month', t.month, 'count', t.cnt, 'revenue', t.revenue) ORDER BY t.month
      ), '[]'::jsonb)
      FROM (
        SELECT to_char(date_trunc('month', a.appointment_date), 'YYYY-MM') AS month,
               COUNT(*) AS cnt,
               COALESCE(SUM(COALESCE(a.price_charged, s.price, 0)) FILTER (WHERE a.status = 'completed'), 0) AS revenue
        FROM public.appointments a
        JOIN public.services s ON s.id = a.service_id
        WHERE a.appointment_date >= (date_trunc('month', v_now) - interval '5 months')::date
        GROUP BY 1
      ) t
    ),

    'top_orgs_30d', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('id', t.id, 'name', t.name, 'appointments', t.cnt) ORDER BY t.cnt DESC
      ), '[]'::jsonb)
      FROM (
        SELECT o.id, o.name, COUNT(a.id) AS cnt
        FROM public.organizations o
        JOIN public.appointments a
          ON a.organization_id = o.id
          AND a.created_at >= v_now - interval '30 days'
        GROUP BY o.id, o.name
        ORDER BY cnt DESC
        LIMIT 10
      ) t
    ),

    -- Orgs activas sin turnos creados en 14 días: riesgo de churn
    'inactive_orgs_14d', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object('id', o.id, 'name', o.name, 'last_appointment_at', la.last_created)
        ORDER BY la.last_created ASC NULLS FIRST
      ), '[]'::jsonb)
      FROM public.organizations o
      LEFT JOIN LATERAL (
        SELECT MAX(a.created_at) AS last_created
        FROM public.appointments a
        WHERE a.organization_id = o.id
      ) la ON true
      WHERE o.is_active
        AND (la.last_created IS NULL OR la.last_created < v_now - interval '14 days')
    ),

    -- Embudo de adopción: dónde se atascan las orgs nuevas
    'funnel', jsonb_build_object(
      'orgs', (SELECT COUNT(*) FROM public.organizations),
      'with_services', (SELECT COUNT(DISTINCT s.organization_id) FROM public.services s),
      'with_staff', (SELECT COUNT(DISTINCT st.organization_id) FROM public.staff_members st),
      'with_appointments', (SELECT COUNT(DISTINCT a.organization_id) FROM public.appointments a),
      'with_active_license', (SELECT COUNT(*) FROM public.organizations o WHERE o.license_end_date >= v_now)
    ),

    'whatsapp_30d', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'delivered', COUNT(*) FILTER (WHERE w.status IN ('delivered', 'read')),
        'failed', COUNT(*) FILTER (WHERE w.status = 'failed')
      )
      FROM public.wa_outbound_messages w
      WHERE w.sent_at >= v_now - interval '30 days'
    ),

    'errors', (
      SELECT jsonb_build_object(
        'last_7d', COUNT(*) FILTER (WHERE e.timestamp >= v_now - interval '7 days'),
        'unresolved', COUNT(*) FILTER (WHERE NOT e.resolved)
      )
      FROM public.error_logs e
    )
  );
END;
$$;

COMMENT ON FUNCTION public.get_admin_platform_stats IS
'Métricas globales de la plataforma para el dashboard de admin: licencias,
suscripciones RevenueCat, actividad por organización, embudo de adopción,
WhatsApp y errores. Solo ejecutable por usuarios con rol admin.';

REVOKE EXECUTE ON FUNCTION public.get_admin_platform_stats FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_admin_platform_stats FROM anon;
GRANT EXECUTE ON FUNCTION public.get_admin_platform_stats TO authenticated;
