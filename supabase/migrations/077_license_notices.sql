-- PRP-003 phase 7: daily license notices by WhatsApp.
--
-- Once a day run_license_notices() writes the notices that are due and asks
-- the edge function license-notices to send them. notice_key is unique per
-- business, kind and day, so running it twice never sends anything twice.
--
-- Calendar, in Cuban calendar days from the expiry day (D):
--   D-2, D-1   owner_reminder
--   D          owner_due + admin_due
--   D+1..D+5   owner_grace          (the 5 days of license_grace_days())
--   D+6        owner_blocked + admin_blocked
-- Pending businesses and businesses without an expiry date get nothing.

CREATE TABLE public.license_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  notice_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN
    ('owner_reminder', 'owner_due', 'owner_grace', 'owner_blocked', 'admin_due', 'admin_blocked')),
  -- Owner notices: the owner's WhatsApp. Admin notices: NULL, the edge
  -- function sends them to the platform number it already knows.
  recipient TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested'
    CHECK (status IN ('requested', 'sent', 'failed')),
  failure_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX license_notices_org_idx
  ON public.license_notices (organization_id, created_at DESC);

ALTER TABLE public.license_notices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins read license notices"
  ON public.license_notices FOR SELECT
  TO authenticated
  USING (public.is_platform_admin());

REVOKE ALL ON public.license_notices FROM PUBLIC, anon;
GRANT SELECT ON public.license_notices TO authenticated;

-- ---------------------------------------------------------------------------
-- Text of a notice
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.license_notice_message(
  p_kind TEXT,
  p_org public.organizations,
  p_expires_on DATE,
  p_today DATE
)
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  v_days INTEGER := p_expires_on - p_today;
  v_grace_left INTEGER := public.license_grace_days() - (p_today - p_expires_on) + 1;
  v_block_on DATE := p_expires_on + public.license_grace_days() + 1;
  v_founder BOOLEAN := p_org.license_founder
    AND (p_org.founder_price_until IS NULL OR p_org.founder_price_until >= p_today);
  v_price TEXT := trim(to_char(public.license_plan_monthly_price(
    p_org.license_plan,
    v_founder,
    p_org.appointments_module_enabled AND p_org.trips_module_enabled
  ), 'FM999990')) || ' USD al mes';
  v_plan TEXT := CASE p_org.license_plan
    WHEN 'personal' THEN 'Personal'
    WHEN 'salon' THEN 'Salón'
    WHEN 'salon_large' THEN 'Salón grande'
    ELSE 'Pasajes' END;
  v_how TEXT := E'\n\nPara pagarlo, responde este mensaje y te decimos cómo.';
BEGIN
  RETURN CASE p_kind
    WHEN 'owner_reminder' THEN
      format(E'⏳ *Turno Flash*\nEl acceso de *%s* vence el %s (%s).\nTu plan %s cuesta %s.',
        p_org.name, to_char(p_expires_on, 'DD/MM/YYYY'),
        CASE WHEN v_days = 1 THEN 'mañana' ELSE format('en %s días', v_days) END,
        v_plan, v_price) || v_how
    WHEN 'owner_due' THEN
      format(E'⏳ *Turno Flash*\nEl acceso de *%s* vence *hoy*.\nTu plan %s cuesta %s. Después de hoy tienes %s días de margen antes de que la app se bloquee.',
        p_org.name, v_plan, v_price, public.license_grace_days()) || v_how
    WHEN 'owner_grace' THEN
      format(E'⚠️ *Turno Flash*\nEl acceso de *%s* venció el %s. %s: el %s la app se bloquea.\nTu plan %s cuesta %s.',
        p_org.name, to_char(p_expires_on, 'DD/MM/YYYY'),
        CASE WHEN v_grace_left = 1 THEN 'Hoy es tu último día de margen'
             ELSE format('Te quedan %s días de margen', v_grace_left) END,
        to_char(v_block_on, 'DD/MM/YYYY'), v_plan, v_price) || v_how
    WHEN 'owner_blocked' THEN
      format(E'🚫 *Turno Flash*\nEl acceso de *%s* quedó bloqueado hoy porque no registramos tu pago.\nTus datos están guardados: en cuanto pagues, todo vuelve a funcionar.\nTu plan %s cuesta %s.',
        p_org.name, v_plan, v_price) || v_how
    WHEN 'admin_due' THEN
      format(E'📌 *Vence hoy*: %s\nPlan %s, %s.\nWhatsApp del dueño: %s',
        p_org.name, v_plan, v_price, COALESCE(NULLIF(btrim(p_org.owner_phone), ''), NULLIF(btrim(p_org.whatsapp_phone), ''), 'sin número'))
    WHEN 'admin_blocked' THEN
      format(E'🔒 *Bloqueado hoy*: %s\nVenció el %s y no pagó en los %s días de margen.\nPlan %s, %s.\nWhatsApp del dueño: %s',
        p_org.name, to_char(p_expires_on, 'DD/MM/YYYY'), public.license_grace_days(), v_plan, v_price,
        COALESCE(NULLIF(btrim(p_org.owner_phone), ''), NULLIF(btrim(p_org.whatsapp_phone), ''), 'sin número'))
  END;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.license_notice_message(TEXT, public.organizations, DATE, DATE)
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Daily run. Returns how many notices it wrote.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_license_notices()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := public.license_today();
  v_grace INTEGER := public.license_grace_days();
  v_org public.organizations;
  v_expires_on DATE;
  v_offset INTEGER;
  v_kind TEXT;
  v_phone TEXT;
  v_written INTEGER := 0;
  v_rows INTEGER;
BEGIN
  FOR v_org IN
    SELECT * FROM public.organizations o
    WHERE o.is_active
      AND o.license_phase IN ('trial', 'paid')
      AND o.license_end_date IS NOT NULL
  LOOP
    v_expires_on := (v_org.license_end_date AT TIME ZONE 'America/Havana')::date;
    v_offset := v_today - v_expires_on;

    FOREACH v_kind IN ARRAY CASE
      WHEN v_offset IN (-2, -1) THEN ARRAY['owner_reminder']
      WHEN v_offset = 0 THEN ARRAY['owner_due', 'admin_due']
      WHEN v_offset BETWEEN 1 AND v_grace THEN ARRAY['owner_grace']
      WHEN v_offset = v_grace + 1 THEN ARRAY['owner_blocked', 'admin_blocked']
      ELSE ARRAY[]::TEXT[]
    END
    LOOP
      v_phone := CASE WHEN v_kind LIKE 'owner_%' THEN
        COALESCE(NULLIF(btrim(v_org.owner_phone), ''), NULLIF(btrim(v_org.whatsapp_phone), ''))
      END;

      INSERT INTO public.license_notices (
        organization_id, notice_key, kind, recipient, message, status, failure_code, completed_at
      )
      VALUES (
        v_org.id,
        v_org.id::text || ':' || v_kind || ':' || v_today::text,
        v_kind,
        v_phone,
        public.license_notice_message(v_kind, v_org, v_expires_on, v_today),
        -- An owner without a number cannot be reached: the admin sees it
        CASE WHEN v_kind LIKE 'owner_%' AND v_phone IS NULL THEN 'failed' ELSE 'requested' END,
        CASE WHEN v_kind LIKE 'owner_%' AND v_phone IS NULL THEN 'no_phone' END,
        CASE WHEN v_kind LIKE 'owner_%' AND v_phone IS NULL THEN now() END
      )
      ON CONFLICT (notice_key) DO NOTHING;

      GET DIAGNOSTICS v_rows = ROW_COUNT;
      v_written := v_written + v_rows;
    END LOOP;
  END LOOP;

  RETURN v_written;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_license_notices() FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Cron: 14:00 UTC is 10:00 in Cuba in summer and 09:00 in winter. Writes the
-- notices and wakes up the edge function that sends the pending ones (same
-- pattern as the 025 jobs).
-- ---------------------------------------------------------------------------
SELECT cron.schedule(
  'license-notices',
  '0 14 * * *',
  $cron$
    SELECT public.run_license_notices();
    SELECT net.http_post(
      url := (SELECT value FROM public.app_config WHERE key = 'SUPABASE_URL') || '/functions/v1/license-notices',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT value FROM public.app_config WHERE key = 'SUPABASE_SERVICE_ROLE_KEY')
      )
    );
  $cron$
);

-- ---------------------------------------------------------------------------
-- Platform stats: how many businesses are on trial, paying or pending
-- (definition of 073 plus three counters).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_admin_platform_stats()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
            AND o.license_end_date >= v_now - make_interval(days => public.license_grace_days())
        ),
        'license_expired', COUNT(*) FILTER (WHERE o.license_end_date < v_now - make_interval(days => public.license_grace_days())),
        'phase_trial', COUNT(*) FILTER (WHERE o.license_phase = 'trial' AND o.license_end_date IS NOT NULL),
        'phase_paid', COUNT(*) FILTER (WHERE o.license_phase = 'paid'),
        'phase_pending', COUNT(*) FILTER (WHERE o.license_phase = 'pending'),
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
$function$;
