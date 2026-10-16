-- 088: reports count days in the business's time zone, and a blocked business gets none.
--
-- (1) "Clientes nuevos" cut the day in UTC: a customer added at 21:00 in La Habana (01:00 UTC)
--     counted on the next day. Appointments already use their local appointment_date; only
--     customers.created_at needed converting (P0-13, point 7 of the pilot QA plan).
-- (2) get_organization_analytics is SECURITY DEFINER, so the restrictive license policies of 087
--     do not reach it: an owner of a blocked business could still read the report through the API.
-- The rest of the function is unchanged (copied from production); CREATE OR REPLACE keeps grants.

CREATE OR REPLACE FUNCTION public.get_organization_analytics(p_start_date date, p_end_date date, p_organization_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_role TEXT;
  v_profile_org UUID;
  v_org UUID;
  v_days INTEGER;
  v_prev_start DATE;
  v_prev_end DATE;
  v_tz TEXT;
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

  -- A blocked business gets no reports either (D-10, 087); platform admins always do
  IF v_role <> 'admin' AND NOT public.org_license_usable(v_org) THEN
    RAISE EXCEPTION 'Acceso bloqueado: la licencia del negocio venció';
  END IF;

  -- Days are the business's days, not UTC ones
  SELECT COALESCE(o.timezone, 'UTC') INTO v_tz
  FROM public.organizations o WHERE o.id = v_org;

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
            AND (c.created_at AT TIME ZONE v_tz)::date BETWEEN p_start_date AND p_end_date
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
            AND (c.created_at AT TIME ZONE v_tz)::date BETWEEN v_prev_start AND v_prev_end
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
$function$;
