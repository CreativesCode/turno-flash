-- ============================================
-- 029: Public online booking (PRP-001)
-- ============================================
-- Functions only: no new tables and no column changes. Everything is
-- SECURITY DEFINER and executable only by service_role (the public-booking
-- edge function); anon and authenticated cannot call any of it.
--
-- Single source of truth: public_booking_slots() decides which times are
-- offered, and create_public_booking() only accepts a time that the very same
-- function returns, under a per-organization advisory lock.
-- Times are handled as minutes since midnight to avoid TIME + interval
-- wrapping past midnight.

-- --------------------------------------------
-- Helpers
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.booking_time_to_min(p_time TIME)
RETURNS INTEGER
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (EXTRACT(HOUR FROM p_time) * 60 + EXTRACT(MINUTE FROM p_time))::INTEGER;
$$;

CREATE OR REPLACE FUNCTION public.booking_min_to_time(p_min INTEGER)
RETURNS TIME
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT make_time(p_min / 60, p_min % 60, 0);
$$;

-- International phone key (digits only). Same rule as phoneToChatId in
-- supabase/functions/_shared/openwa.ts, so web bookings match customers that
-- were created from the dashboard (phone + phone_country_code).
CREATE OR REPLACE FUNCTION public.booking_phone_key(p_phone TEXT, p_country_code TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN btrim(coalesce(p_phone, '')) LIKE '+%'
      THEN regexp_replace(p_phone, '\D', '', 'g')
    WHEN coalesce(regexp_replace(p_country_code, '\D', '', 'g'), '') = ''
      OR regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
         LIKE regexp_replace(p_country_code, '\D', '', 'g') || '%'
      THEN regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
    ELSE regexp_replace(p_country_code, '\D', '', 'g')
         || regexp_replace(coalesce(p_phone, ''), '\D', '', 'g')
  END;
$$;

-- The booking page accepts traffic only if the owner enabled it, the
-- organization is active and its license is usable. service_role bypasses the
-- license RLS from 027, so it is checked here explicitly.
CREATE OR REPLACE FUNCTION public.public_booking_org_open(p_org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organizations o
    JOIN public.business_settings bs ON bs.organization_id = o.id
    WHERE o.id = p_org_id
      AND o.is_active
      AND bs.booking_page_enabled IS TRUE
      AND COALESCE(bs.allow_online_booking, true)
  )
  AND public.org_license_usable(p_org_id);
$$;

-- Staff that can take a service online: active, bookable, accepting online
-- bookings and explicitly assigned to the service (staff_services is strict:
-- no assignment means not offered).
CREATE OR REPLACE FUNCTION public.public_booking_staff_for_service(
  p_org_id UUID,
  p_service_id UUID
)
RETURNS TABLE (staff_id UUID, sort_order INTEGER)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, COALESCE(m.sort_order, 0)
  FROM public.staff_members m
  JOIN public.staff_services ss
    ON ss.staff_id = m.id AND ss.service_id = p_service_id
  WHERE m.organization_id = p_org_id
    AND COALESCE(m.is_active, false)
    AND COALESCE(m.is_bookable, false)
    AND COALESCE(m.accepts_online_bookings, false);
$$;

-- --------------------------------------------
-- is_staff_slot_free: [start, start + occupied) is inside the staff's weekly
-- schedule, does not overlap an active appointment, and does not overlap a
-- blocking exception of the staff member or of the whole business
-- (staff_exceptions.staff_id IS NULL).
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.is_staff_slot_free(
  p_staff_id UUID,
  p_date DATE,
  p_start TIME,
  p_occupied_minutes INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_tz TEXT;
  v_start INTEGER := public.booking_time_to_min(p_start);
  v_end INTEGER := public.booking_time_to_min(p_start) + p_occupied_minutes;
  v_from TIMESTAMPTZ;
  v_to TIMESTAMPTZ;
BEGIN
  IF p_occupied_minutes IS NULL OR p_occupied_minutes <= 0 OR v_end > 24 * 60 THEN
    RETURN false;
  END IF;

  SELECT m.organization_id, COALESCE(o.timezone, 'UTC')
    INTO v_org_id, v_tz
  FROM public.staff_members m
  JOIN public.organizations o ON o.id = m.organization_id
  WHERE m.id = p_staff_id;

  IF v_org_id IS NULL THEN
    RETURN false;
  END IF;

  -- 1. Inside a weekly schedule range valid on that date (0 = Sunday)
  IF NOT EXISTS (
    SELECT 1
    FROM public.staff_availability a
    WHERE a.staff_id = p_staff_id
      AND a.day_of_week = EXTRACT(DOW FROM p_date)::INTEGER
      AND COALESCE(a.is_available, true)
      AND (a.effective_from IS NULL OR a.effective_from <= p_date)
      AND (a.effective_until IS NULL OR a.effective_until >= p_date)
      AND public.booking_time_to_min(a.start_time) <= v_start
      AND public.booking_time_to_min(a.end_time) >= v_end
  ) THEN
    RETURN false;
  END IF;

  -- 2. No overlap with the staff member's active appointments
  --    (same status list as AppointmentService.checkAvailability)
  IF EXISTS (
    SELECT 1
    FROM public.appointments ap
    WHERE ap.staff_id = p_staff_id
      AND ap.appointment_date = p_date
      AND ap.status IN (
        'pending', 'confirmed', 'reminded',
        'client_confirmed', 'checked_in', 'in_progress'
      )
      AND public.booking_time_to_min(ap.start_time) < v_end
      AND public.booking_time_to_min(ap.end_time) > v_start
  ) THEN
    RETURN false;
  END IF;

  -- 3. No blocking exception (special_hours adds time, so it never blocks)
  v_from := (p_date + p_start) AT TIME ZONE v_tz;
  v_to := v_from + make_interval(mins => p_occupied_minutes);
  IF EXISTS (
    SELECT 1
    FROM public.staff_exceptions e
    WHERE e.organization_id = v_org_id
      AND (e.staff_id = p_staff_id OR e.staff_id IS NULL)
      AND e.exception_type IN ('time_off', 'holiday', 'blocked')
      AND e.start_datetime < v_to
      AND e.end_datetime > v_from
  ) THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- --------------------------------------------
-- public_booking_slots: free start times for a service on a date.
-- p_staff_id NULL = "no preference": one row per time with the first free
-- staff member by sort_order. Returns nothing when the page is closed, the
-- service is not bookable online or the date is outside the booking window
-- (computed in the organization's timezone).
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.public_booking_slots(
  p_org_id UUID,
  p_service_id UUID,
  p_staff_id UUID,
  p_date DATE
)
RETURNS TABLE (start_time TIME, staff_id UUID)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_tz TEXT;
  v_now_local TIMESTAMP;
  v_step INTEGER;
  v_allow_same_day BOOLEAN;
  v_occupied INTEGER;
  v_min_hours INTEGER;
  v_max_days INTEGER;
BEGIN
  IF NOT public.public_booking_org_open(p_org_id) THEN
    RETURN;
  END IF;

  SELECT COALESCE(o.timezone, 'UTC') INTO v_tz
  FROM public.organizations o
  WHERE o.id = p_org_id;
  v_now_local := now() AT TIME ZONE v_tz;

  SELECT GREATEST(COALESCE(bs.slot_duration_minutes, 30), 5),
         COALESCE(bs.allow_same_day_booking, true)
    INTO v_step, v_allow_same_day
  FROM public.business_settings bs
  WHERE bs.organization_id = p_org_id;

  SELECT s.duration_minutes + COALESCE(s.buffer_time_minutes, 0),
         COALESCE(s.min_advance_booking_hours, 2),
         COALESCE(s.max_advance_booking_days, 60)
    INTO v_occupied, v_min_hours, v_max_days
  FROM public.services s
  WHERE s.id = p_service_id
    AND s.organization_id = p_org_id
    AND COALESCE(s.is_active, false)
    AND COALESCE(s.available_for_online_booking, false);

  IF v_occupied IS NULL OR v_occupied <= 0 THEN
    RETURN;
  END IF;

  IF p_date < v_now_local::DATE
     OR p_date > v_now_local::DATE + v_max_days
     OR (NOT v_allow_same_day AND p_date = v_now_local::DATE) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT DISTINCT ON (c.start_min)
    public.booking_min_to_time(c.start_min),
    c.staff_id
  FROM (
    SELECT st.staff_id, st.sort_order, gs.start_min
    FROM public.public_booking_staff_for_service(p_org_id, p_service_id) st
    JOIN public.staff_availability a
      ON a.staff_id = st.staff_id
     AND a.day_of_week = EXTRACT(DOW FROM p_date)::INTEGER
     AND COALESCE(a.is_available, true)
     AND (a.effective_from IS NULL OR a.effective_from <= p_date)
     AND (a.effective_until IS NULL OR a.effective_until >= p_date)
    CROSS JOIN LATERAL generate_series(
      public.booking_time_to_min(a.start_time),
      public.booking_time_to_min(a.end_time) - v_occupied,
      v_step
    ) AS gs(start_min)
    WHERE p_staff_id IS NULL OR st.staff_id = p_staff_id
  ) c
  WHERE p_date + public.booking_min_to_time(c.start_min)
          >= v_now_local + make_interval(hours => v_min_hours)
    AND public.is_staff_slot_free(
      c.staff_id, p_date, public.booking_min_to_time(c.start_min), v_occupied
    )
  ORDER BY c.start_min, c.sort_order;
END;
$$;

-- --------------------------------------------
-- public_booking_info: public data of a booking page by slug. Exposes only
-- what the page needs (no staff contact data, no customer data). Only
-- services with at least one assigned staff member that has a schedule.
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.public_booking_info(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_name TEXT;
  v_slug TEXT;
  v_tz TEXT;
  v_allow_same_day BOOLEAN;
BEGIN
  SELECT o.id, o.name, o.slug, COALESCE(o.timezone, 'UTC')
    INTO v_org_id, v_name, v_slug, v_tz
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
      'timezone', v_tz
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
$$;

-- --------------------------------------------
-- create_public_booking: atomic web booking. Returns
--   {success: true, appointment_id, appointment_number, status, staff_id, date, start_time}
-- or {success: false, error: <code>} with code in
--   booking_closed | invalid_input | service_unavailable | slot_taken | too_many_bookings
-- Status comes from services.requires_approval (pending) or confirmed; the
-- caller never decides it. The existing WhatsApp INSERT trigger notifies.
-- --------------------------------------------
CREATE OR REPLACE FUNCTION public.create_public_booking(
  p_org_id UUID,
  p_service_id UUID,
  p_staff_id UUID,
  p_date DATE,
  p_start TIME,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_future_bookings CONSTANT INTEGER := 3;
  v_tz TEXT;
  v_phone_key TEXT;
  v_duration INTEGER;
  v_occupied INTEGER;
  v_requires_approval BOOLEAN;
  v_staff_id UUID;
  v_customer_id UUID;
  v_future_count INTEGER;
  v_appointment_id UUID;
  v_appointment_number TEXT;
  v_status public.appointment_status;
BEGIN
  -- Serialize web bookings per organization: prevents two bookings on the
  -- same time and the MAX()+1 race of generate_appointment_number.
  PERFORM pg_advisory_xact_lock(hashtextextended('public_booking:' || p_org_id::TEXT, 0));

  IF NOT public.public_booking_org_open(p_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_closed');
  END IF;

  v_phone_key := public.booking_phone_key(p_phone, NULL);
  IF btrim(COALESCE(p_first_name, '')) = ''
     OR btrim(COALESCE(p_last_name, '')) = ''
     OR length(COALESCE(p_first_name, '')) > 80
     OR length(COALESCE(p_last_name, '')) > 80
     OR length(COALESCE(p_email, '')) > 254
     OR length(COALESCE(p_notes, '')) > 500
     OR COALESCE(length(v_phone_key), 0) NOT BETWEEN 8 AND 15 THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_input');
  END IF;

  SELECT COALESCE(o.timezone, 'UTC') INTO v_tz
  FROM public.organizations o
  WHERE o.id = p_org_id;

  SELECT s.duration_minutes,
         s.duration_minutes + COALESCE(s.buffer_time_minutes, 0),
         COALESCE(s.requires_approval, false)
    INTO v_duration, v_occupied, v_requires_approval
  FROM public.services s
  WHERE s.id = p_service_id
    AND s.organization_id = p_org_id
    AND COALESCE(s.is_active, false)
    AND COALESCE(s.available_for_online_booking, false);

  IF v_duration IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'service_unavailable');
  END IF;

  -- The time must be one the page offers (same function, under the lock)
  SELECT sl.staff_id INTO v_staff_id
  FROM public.public_booking_slots(p_org_id, p_service_id, p_staff_id, p_date) sl
  WHERE sl.start_time = p_start
  LIMIT 1;

  IF v_staff_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'slot_taken');
  END IF;

  -- Anti-abuse: active future bookings of this phone in the organization
  SELECT count(*) INTO v_future_count
  FROM public.appointments ap
  JOIN public.customers c ON c.id = ap.customer_id
  WHERE ap.organization_id = p_org_id
    AND public.booking_phone_key(c.phone, c.phone_country_code) = v_phone_key
    AND ap.status IN (
      'pending', 'confirmed', 'reminded',
      'client_confirmed', 'checked_in', 'in_progress'
    )
    AND ap.appointment_date + ap.start_time >= now() AT TIME ZONE v_tz;

  IF v_future_count >= c_max_future_bookings THEN
    RETURN jsonb_build_object('success', false, 'error', 'too_many_bookings');
  END IF;

  -- Reuse the customer by phone (most recent if there are duplicates);
  -- existing data is never overwritten.
  SELECT c.id INTO v_customer_id
  FROM public.customers c
  WHERE c.organization_id = p_org_id
    AND public.booking_phone_key(c.phone, c.phone_country_code) = v_phone_key
  ORDER BY c.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (
      organization_id, first_name, last_name, phone, email, is_active
    )
    VALUES (
      p_org_id,
      btrim(p_first_name),
      btrim(p_last_name),
      '+' || v_phone_key,
      NULLIF(btrim(COALESCE(p_email, '')), ''),
      true
    )
    RETURNING id INTO v_customer_id;
  END IF;

  v_status := CASE WHEN v_requires_approval THEN 'pending' ELSE 'confirmed' END;

  -- end_time includes the buffer, same as AppointmentService.calculateEndTime
  INSERT INTO public.appointments (
    organization_id, customer_id, service_id, staff_id,
    appointment_date, start_time, end_time,
    status, source, timezone, notes
  )
  VALUES (
    p_org_id, v_customer_id, p_service_id, v_staff_id,
    p_date, p_start,
    public.booking_min_to_time(public.booking_time_to_min(p_start) + v_occupied),
    v_status, 'web', v_tz, NULLIF(btrim(COALESCE(p_notes, '')), '')
  )
  RETURNING id, appointment_number INTO v_appointment_id, v_appointment_number;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment_id,
    'appointment_number', v_appointment_number,
    'status', v_status,
    'staff_id', v_staff_id,
    'date', p_date,
    'start_time', p_start
  );
END;
$$;

-- --------------------------------------------
-- Permissions: only service_role (edge function public-booking)
-- --------------------------------------------
REVOKE EXECUTE ON FUNCTION public.booking_time_to_min(TIME) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.booking_min_to_time(INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.booking_phone_key(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.public_booking_org_open(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.public_booking_staff_for_service(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_staff_slot_free(UUID, DATE, TIME, INTEGER) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.public_booking_slots(UUID, UUID, UUID, DATE) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.public_booking_info(TEXT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_public_booking(UUID, UUID, UUID, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.public_booking_info(TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.public_booking_slots(UUID, UUID, UUID, DATE) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_public_booking(UUID, UUID, UUID, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.public_booking_slots IS
'Free start times for a service on a date (PRP-001). NULL staff = first free staff by sort_order.';
COMMENT ON FUNCTION public.create_public_booking IS
'Atomic public web booking (PRP-001). Only service_role. Status from services.requires_approval.';
