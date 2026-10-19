-- 089: per-business activity for the platform admin (TUR0006).
--
-- The admin panel only had platform-wide totals; nothing showed how much each business
-- actually uses the app. Two admin-only functions:
--   get_admin_organization_activity  -> the "Actividad" card of one organization
--   get_admin_organizations_activity -> one line per business for the organizations list
--
-- "Accepted" = left pending and was not cancelled (there is no status history, only the
-- current status). Periods use the appointment date / departure date, like the owner's
-- report (get_organization_analytics), so both figures match. NULL dates = all time.

CREATE OR REPLACE FUNCTION public.get_admin_organization_activity(
  p_organization_id uuid,
  p_start_date date DEFAULT NULL,
  p_end_date date DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_tz TEXT;
  v_start DATE := COALESCE(p_start_date, '-infinity'::date);
  v_end DATE := COALESCE(p_end_date, 'infinity'::date);
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden ver la actividad de un negocio';
  END IF;

  IF v_end < v_start THEN
    RAISE EXCEPTION 'Rango de fechas inválido';
  END IF;

  SELECT COALESCE(o.timezone, 'UTC') INTO v_tz
  FROM public.organizations o WHERE o.id = p_organization_id;

  IF v_tz IS NULL THEN
    RAISE EXCEPTION 'Organización no encontrada';
  END IF;

  RETURN jsonb_build_object(
    'organization_id', p_organization_id,
    'start_date', p_start_date,
    'end_date', p_end_date,

    'appointments', (
      SELECT jsonb_build_object(
        'total', COUNT(*),
        'pending', COUNT(*) FILTER (WHERE a.status = 'pending'),
        'accepted', COUNT(*) FILTER (WHERE a.status NOT IN ('pending', 'cancelled')),
        'client_confirmed', COUNT(*) FILTER (WHERE a.client_confirmed_at IS NOT NULL),
        'completed', COUNT(*) FILTER (WHERE a.status = 'completed'),
        'cancelled', COUNT(*) FILTER (WHERE a.status = 'cancelled'),
        'no_show', COUNT(*) FILTER (WHERE a.status = 'no_show'),
        'online', COUNT(*) FILTER (WHERE a.source = 'web'),
        'panel', COUNT(*) FILTER (WHERE a.source IS DISTINCT FROM 'web'),
        'revenue', COALESCE(SUM(COALESCE(a.price_charged, s.price, 0)) FILTER (WHERE a.status = 'completed'), 0)
      )
      FROM public.appointments a
      LEFT JOIN public.services s ON s.id = a.service_id
      WHERE a.organization_id = p_organization_id
        AND a.appointment_date BETWEEN v_start AND v_end
    ),

    -- Every customer ever added (also deactivated ones), so "new" never exceeds "total"
    'customers', jsonb_build_object(
      'total', (
        SELECT COUNT(*) FROM public.customers c
        WHERE c.organization_id = p_organization_id
      ),
      'new', (
        SELECT COUNT(*) FROM public.customers c
        WHERE c.organization_id = p_organization_id
          AND (c.created_at AT TIME ZONE v_tz)::date BETWEEN v_start AND v_end
      )
    ),

    'trips', (
      SELECT jsonb_build_object(
        'departures', (
          SELECT COUNT(*) FROM public.trips t
          WHERE t.organization_id = p_organization_id
            AND t.cancelled_at IS NULL
            AND t.departure_date BETWEEN v_start AND v_end
        ),
        'bookings', COUNT(b.id),
        'pending', COUNT(b.id) FILTER (WHERE b.status = 'pending'),
        'confirmed', COUNT(b.id) FILTER (WHERE b.status = 'confirmed'),
        'cancelled', COUNT(b.id) FILTER (WHERE b.status = 'cancelled'),
        'seats', COALESCE(SUM(b.seats) FILTER (WHERE b.status <> 'cancelled'), 0),
        'collected', COALESCE(SUM(b.amount_paid) FILTER (WHERE b.status <> 'cancelled'), 0)
      )
      FROM public.trip_bookings b
      JOIN public.trips t ON t.id = b.trip_id
      WHERE t.organization_id = p_organization_id
        AND t.departure_date BETWEEN v_start AND v_end
    ),

    'whatsapp_sent', (
      SELECT COUNT(*) FROM public.wa_outbound_messages w
      WHERE w.organization_id = p_organization_id
        AND (w.sent_at AT TIME ZONE v_tz)::date BETWEEN v_start AND v_end
    ),

    -- Setup and follow-up signals: always current, not tied to the period
    'setup', jsonb_build_object(
      'staff', (
        SELECT COUNT(*) FROM public.staff_members st
        WHERE st.organization_id = p_organization_id AND st.is_active
      ),
      'services', (
        SELECT COUNT(*) FROM public.services s
        WHERE s.organization_id = p_organization_id AND s.is_active
      )
    ),
    'last_appointment_at', (
      SELECT MAX(a.created_at) FROM public.appointments a
      WHERE a.organization_id = p_organization_id
    ),
    'last_trip_booking_at', (
      SELECT MAX(b.created_at) FROM public.trip_bookings b
      WHERE b.organization_id = p_organization_id
    ),
    'owner_last_sign_in_at', (
      SELECT MAX(u.last_sign_in_at)
      FROM public.user_profiles up
      JOIN auth.users u ON u.id = up.user_id
      WHERE up.organization_id = p_organization_id AND up.role = 'owner'
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_organizations_activity()
RETURNS TABLE (
  organization_id uuid,
  appointments bigint,
  trip_bookings bigint,
  last_activity_at timestamptz
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Solo administradores pueden ver la actividad de los negocios';
  END IF;

  RETURN QUERY
  SELECT o.id,
         COALESCE(a.cnt, 0),
         COALESCE(b.cnt, 0),
         GREATEST(a.last_at, b.last_at)
  FROM public.organizations o
  LEFT JOIN (
    SELECT ap.organization_id AS org_id, COUNT(*) AS cnt, MAX(ap.created_at) AS last_at
    FROM public.appointments ap GROUP BY ap.organization_id
  ) a ON a.org_id = o.id
  LEFT JOIN (
    SELECT tb.organization_id AS org_id, COUNT(*) AS cnt, MAX(tb.created_at) AS last_at
    FROM public.trip_bookings tb GROUP BY tb.organization_id
  ) b ON b.org_id = o.id;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_organization_activity(uuid, date, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_admin_organizations_activity() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_organization_activity(uuid, date, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_organizations_activity() TO authenticated;
