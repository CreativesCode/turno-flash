-- P3-10: the public pages had no way to reach the business. Both info
-- payloads now carry organizations.whatsapp_phone as contact_phone: the same
-- number the WhatsApp messages already show to customers.
-- P3-18: public_trips_info no longer returns the driver's phone; the page
-- never showed it and anyone with the link could read it.
-- Both bodies are the live definitions with only those changes.
CREATE OR REPLACE FUNCTION public.public_booking_info(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org_id UUID;
  v_name TEXT;
  v_slug TEXT;
  v_tz TEXT;
  v_allow_same_day BOOLEAN;
  v_contact_phone TEXT;
BEGIN
  SELECT o.id, o.name, o.slug, COALESCE(o.timezone, 'UTC'), o.whatsapp_phone
    INTO v_org_id, v_name, v_slug, v_tz, v_contact_phone
  FROM public.organizations o
  WHERE o.slug = lower(btrim(p_slug));

  IF v_org_id IS NULL OR NOT public.public_booking_org_open(v_org_id) THEN
    RETURN jsonb_build_object('available', false);
  END IF;

  SELECT COALESCE(bs.allow_same_day_booking, true) INTO v_allow_same_day
  FROM public.business_settings bs
  WHERE bs.organization_id = v_org_id;

  RETURN jsonb_build_object(
    'available', true,
    'organization', jsonb_build_object(
      'id', v_org_id,
      'name', v_name,
      'slug', v_slug,
      'timezone', v_tz,
      'contact_phone', v_contact_phone
    ),
    'today', (now() AT TIME ZONE v_tz)::DATE,
    'allow_same_day', v_allow_same_day,
    'services', COALESCE((
      SELECT jsonb_agg(svc ORDER BY svc_order, svc_name)
      FROM (
        SELECT
          COALESCE(s.sort_order, 0) AS svc_order,
          s.name AS svc_name,
          jsonb_build_object(
            'id', s.id,
            'name', s.name,
            'description', s.description,
            'duration_minutes', s.duration_minutes,
            'price', s.price,
            'currency', s.currency,
            'color', s.color,
            'requires_approval', COALESCE(s.requires_approval, false),
            'max_advance_booking_days', COALESCE(s.max_advance_booking_days, 60),
            'staff_ids', (
              SELECT jsonb_agg(st.staff_id ORDER BY st.sort_order)
              FROM public.public_booking_staff_for_service(v_org_id, s.id) st
              WHERE EXISTS (
                SELECT 1 FROM public.staff_availability a
                WHERE a.staff_id = st.staff_id AND COALESCE(a.is_available, true)
              )
            )
          ) AS svc
        FROM public.services s
        WHERE s.organization_id = v_org_id
          AND COALESCE(s.is_active, false)
          AND COALESCE(s.available_for_online_booking, false)
      ) listed
      WHERE svc -> 'staff_ids' <> 'null'::JSONB
    ), '[]'::JSONB),
    'staff', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', m.id,
          'name', COALESCE(
            NULLIF(btrim(m.nickname), ''),
            btrim(m.first_name || ' ' || left(COALESCE(m.last_name, ''), 1) || '.')
          ),
          'color', m.color,
          'photo_url', m.photo_url,
          'work_days', (
            SELECT jsonb_agg(DISTINCT a.day_of_week)
            FROM public.staff_availability a
            WHERE a.staff_id = m.id AND COALESCE(a.is_available, true)
          )
        )
        ORDER BY COALESCE(m.sort_order, 0), m.first_name
      )
      FROM public.staff_members m
      WHERE m.organization_id = v_org_id
        AND COALESCE(m.is_active, false)
        AND COALESCE(m.is_bookable, false)
        AND COALESCE(m.accepts_online_bookings, false)
        AND EXISTS (SELECT 1 FROM public.staff_services ss WHERE ss.staff_id = m.id)
        AND EXISTS (
          SELECT 1 FROM public.staff_availability a
          WHERE a.staff_id = m.id AND COALESCE(a.is_available, true)
        )
    ), '[]'::JSONB)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.public_trips_info(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_org RECORD;
  v_tz TEXT;
  v_trips JSONB;
BEGIN
  SELECT o.id, o.name, o.timezone, o.currency, o.whatsapp_phone,
         bs.deposit_instructions
    INTO v_org
  FROM public.organizations o
  LEFT JOIN public.business_settings bs ON bs.organization_id = o.id
  WHERE o.slug = p_slug;

  IF v_org.id IS NULL OR NOT public.public_trips_org_open(v_org.id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_closed');
  END IF;

  v_tz := COALESCE(v_org.timezone, 'UTC');

  SELECT COALESCE(jsonb_agg(t ORDER BY t.departure_date, t.departure_time), '[]'::jsonb)
    INTO v_trips
  FROM (
    SELECT tr.id,
           tr.title,
           tr.description,
           tr.pickup_location,
           tr.departure_date,
           tr.departure_time,
           tr.return_time,
           tr.price_per_seat,
           tr.deposit_per_seat,
           tr.round_trip_enabled,
           COALESCE(tr.price_round_trip, tr.price_per_seat) AS price_round_trip,
           tr.currency,
           tr.requires_approval,
           tr.total_seats,
           tr.max_seats_per_booking,
           tr.driver_name,
           tr.vehicle_description,
           tr.vehicle_photo_path,
           tr.booking_opens_at,
           tr.booking_closes_at,
           -- Listed even before it opens, so the page can say "opens on…".
           (tr.booking_opens_at IS NULL OR tr.booking_opens_at <= now())
             AND (tr.booking_closes_at IS NULL OR tr.booking_closes_at > now())
             AS booking_open,
           GREATEST(tr.total_seats - public.trip_seats_taken(tr.id), 0) AS seats_left,
           COALESCE((
             SELECT jsonb_agg(
                      jsonb_build_object(
                        'id', pp.id,
                        'name', pp.name,
                        'details', pp.details,
                        'pickup_time', pp.pickup_time,
                        'price_per_seat', pp.price_per_seat,
                        'price_round_trip', COALESCE(
                          pp.price_round_trip, tr.price_round_trip, pp.price_per_seat
                        ),
                        'deposit_per_seat', pp.deposit_per_seat
                      )
                      ORDER BY pp.sort_order, pp.name
                    )
             FROM public.trip_pickup_points pp
             WHERE pp.trip_id = tr.id
           ), '[]'::jsonb) AS pickup_points
    FROM public.trips tr
    WHERE tr.organization_id = v_org.id
      AND tr.is_published
      AND tr.cancelled_at IS NULL
      AND (tr.departure_date + tr.departure_time) >= (now() AT TIME ZONE v_tz)
  ) t;

  RETURN jsonb_build_object(
    'success', true,
    'organization', jsonb_build_object(
      'id', v_org.id,
      'name', v_org.name,
      'timezone', v_tz,
      'currency', COALESCE(v_org.currency, 'USD'),
      'deposit_instructions', v_org.deposit_instructions,
      'contact_phone', v_org.whatsapp_phone
    ),
    'trips', v_trips
  );
END;
$function$;
