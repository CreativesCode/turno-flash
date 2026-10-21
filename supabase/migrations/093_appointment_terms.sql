-- 093: price and economic conditions of each appointment (TUR0007, PRP-007).
--
-- The service gives the defaults and each appointment can adjust them: price (price_charged, which
-- the reports already use), deposit type and value, the deadline to pay it and a free text with the
-- conditions (what the price includes, cancellation and refunds). The deadline is "hours before the
-- appointment" on the service and a concrete date on the appointment; nothing happens on its own
-- when it passes. Only an owner or admin changes them, through set_appointment_terms().

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS deposit_due_hours INTEGER,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT;

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_terms_check;
ALTER TABLE public.services ADD CONSTRAINT services_terms_check CHECK (
  (deposit_due_hours IS NULL OR deposit_due_hours BETWEEN 1 AND 720)
  AND (payment_terms IS NULL OR char_length(payment_terms) <= 1000)
);

COMMENT ON COLUMN public.services.deposit_due_hours IS
  'The deposit is due this many hours before the appointment. NULL = no deadline.';
COMMENT ON COLUMN public.services.payment_terms IS
  'What the price includes, cancellation and refunds: shown to the customer when booking.';

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS deposit_type TEXT CHECK (deposit_type IN ('fixed', 'percent')),
  ADD COLUMN IF NOT EXISTS deposit_value NUMERIC(10,2) CHECK (deposit_value > 0),
  ADD COLUMN IF NOT EXISTS deposit_due_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS payment_terms TEXT CHECK (char_length(payment_terms) <= 1000),
  ADD COLUMN IF NOT EXISTS terms_updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS terms_updated_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 2. A deposit for a given price
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.deposit_amount_for(p_type TEXT, p_value NUMERIC, p_price NUMERIC)
RETURNS NUMERIC(10,2)
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT NULLIF(
    CASE p_type
      WHEN 'fixed' THEN p_value
      WHEN 'percent' THEN ROUND(COALESCE(p_price, 0) * p_value / 100)
    END, 0);
$function$;

-- Hours before the appointment, in the business time zone, and never in the past
CREATE OR REPLACE FUNCTION public.deposit_due_from(
  p_date DATE, p_start TIME, p_tz TEXT, p_hours INTEGER
)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $function$
  SELECT CASE WHEN p_hours IS NOT NULL THEN
    GREATEST(((p_date + p_start) AT TIME ZONE COALESCE(NULLIF(p_tz, ''), 'UTC'))
             - make_interval(hours => p_hours), now())
  END;
$function$;

-- ---------------------------------------------------------------------------
-- 3. New appointments: the conditions of the service, unless an owner or admin set their own
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_appointment_deposit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_manager BOOLEAN := COALESCE(public.auth_user_role() IN ('owner', 'admin'), false);
  v_svc RECORD;
  v_type TEXT;
  v_value NUMERIC;
  v_price NUMERIC;
  v_amount NUMERIC(10,2);
BEGIN
  SELECT s.price, s.deposit_type, s.deposit_value, s.deposit_due_hours, s.payment_terms
    INTO v_svc
  FROM public.services s WHERE s.id = NEW.service_id;

  NEW.deposit_verified_by := NULL;
  NEW.deposit_verified_at := NULL;
  NEW.terms_updated_by := NULL;
  NEW.terms_updated_at := NULL;

  IF NOT v_manager OR NULLIF(btrim(COALESCE(NEW.payment_terms, '')), '') IS NULL THEN
    NEW.payment_terms := v_svc.payment_terms;
  END IF;

  IF v_manager AND NEW.deposit_type IS NOT NULL THEN
    v_type := NEW.deposit_type;
    v_value := NEW.deposit_value;
  ELSE
    v_type := v_svc.deposit_type;
    v_value := v_svc.deposit_value;
  END IF;
  v_price := COALESCE(NEW.price_charged, v_svc.price);
  v_amount := public.deposit_amount_for(v_type, v_value, v_price);

  IF v_amount IS NULL OR (NEW.deposit_waived AND v_manager) THEN
    NEW.deposit_amount := NULL;
    NEW.deposit_status := NULL;
    NEW.deposit_type := NULL;
    NEW.deposit_value := NULL;
    NEW.deposit_due_at := NULL;
    NEW.deposit_waived := v_amount IS NOT NULL;
    RETURN NEW;
  END IF;

  IF (v_type = 'percent' AND v_value > 100)
     OR (v_type = 'fixed' AND v_price IS NOT NULL AND v_value > v_price) THEN
    RAISE EXCEPTION 'deposit_above_price';
  END IF;

  NEW.deposit_type := v_type;
  NEW.deposit_value := v_value;
  NEW.deposit_amount := v_amount;
  NEW.deposit_waived := false;

  IF NOT v_manager OR NEW.deposit_due_at IS NULL THEN
    NEW.deposit_due_at := public.deposit_due_from(
      NEW.appointment_date, NEW.start_time,
      COALESCE(NULLIF(NEW.timezone, ''),
               (SELECT o.timezone FROM public.organizations o WHERE o.id = NEW.organization_id)),
      v_svc.deposit_due_hours);
  END IF;

  IF NEW.deposit_status = 'verified' AND v_manager THEN
    NEW.deposit_verified_by := auth.uid();
    NEW.deposit_verified_at := now();
    RETURN NEW;
  END IF;

  NEW.deposit_status := 'pending';
  IF NEW.status NOT IN ('cancelled', 'no_show', 'completed') THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Updates: the new columns follow the same rule as the deposit (090/092), and moving an
--    appointment moves the deadline of a deposit still owed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_appointment_deposit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  -- COALESCE: an unset setting is NULL, and NOT NULL would let the change through
  v_allowed BOOLEAN := COALESCE(current_setting('app.deposit_change', true) = 'on', false)
    OR COALESCE(auth.role() = 'service_role', false)
    -- The edge functions connect as service_role whatever key they use (sb_secret_ keys carry
    -- no JWT role claim), and SQL run by the team as postgres
    OR current_user IN ('service_role', 'postgres', 'supabase_admin');
  v_hours INTEGER;
BEGIN
  IF NOT v_allowed AND (
    NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount
    OR NEW.deposit_status IS DISTINCT FROM OLD.deposit_status
    OR NEW.deposit_waived IS DISTINCT FROM OLD.deposit_waived
    OR NEW.deposit_verified_by IS DISTINCT FROM OLD.deposit_verified_by
    OR NEW.deposit_verified_at IS DISTINCT FROM OLD.deposit_verified_at
    OR NEW.deposit_type IS DISTINCT FROM OLD.deposit_type
    OR NEW.deposit_value IS DISTINCT FROM OLD.deposit_value
    OR NEW.deposit_due_at IS DISTINCT FROM OLD.deposit_due_at
    OR NEW.payment_terms IS DISTINCT FROM OLD.payment_terms
    OR NEW.terms_updated_by IS DISTINCT FROM OLD.terms_updated_by
    OR NEW.terms_updated_at IS DISTINCT FROM OLD.terms_updated_at
  ) THEN
    RAISE EXCEPTION 'deposit_change_not_allowed';
  END IF;

  IF NEW.deposit_amount IS NOT NULL
     AND NEW.deposit_status IS DISTINCT FROM 'verified'
     AND OLD.status = 'pending'
     AND NEW.status NOT IN ('pending', 'cancelled', 'no_show') THEN
    RAISE EXCEPTION 'deposit_not_verified';
  END IF;

  IF NEW.status IN ('cancelled', 'no_show')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.deposit_status IN ('pending', 'requested', 'paid') THEN
    NEW.deposit_status := 'cancelled';
  END IF;

  -- Moved: a deposit still owed is due the same hours before the new time
  IF (NEW.appointment_date, NEW.start_time) IS DISTINCT FROM (OLD.appointment_date, OLD.start_time)
     AND NEW.deposit_status IN ('pending', 'requested') THEN
    SELECT s.deposit_due_hours INTO v_hours FROM public.services s WHERE s.id = NEW.service_id;
    IF v_hours IS NOT NULL THEN
      NEW.deposit_due_at := public.deposit_due_from(
        NEW.appointment_date, NEW.start_time, NEW.timezone, v_hours);
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ---------------------------------------------------------------------------
-- 5. An owner or admin adjusts the conditions of one appointment. SECURITY INVOKER: RLS (and the
--    license policy of 087) decide which appointments the caller reaches.
--    - price NULL = the service price
--    - a deposit already paid, verified or refunded keeps its amount and deadline
--    - no deposit type on an owed deposit = waive it (confirms a pending appointment)
--    - a new or changed deposit is computed with the appointment price
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_appointment_terms(
  p_appointment_id UUID,
  p_price NUMERIC,
  p_deposit_type TEXT,
  p_deposit_value NUMERIC,
  p_deposit_due_at TIMESTAMPTZ,
  p_payment_terms TEXT
)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_appt public.appointments%ROWTYPE;
  v_price NUMERIC;
  v_open BOOLEAN;
  v_locked BOOLEAN;
  v_amount NUMERIC(10,2);
BEGIN
  IF NOT COALESCE(public.auth_user_role() IN ('owner', 'admin'), false) THEN
    RAISE EXCEPTION 'terms_forbidden';
  END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'terms_not_found';
  END IF;
  IF p_price IS NOT NULL AND p_price < 0 THEN
    RAISE EXCEPTION 'invalid_price';
  END IF;

  v_price := COALESCE(p_price, (SELECT s.price FROM public.services s WHERE s.id = v_appt.service_id));
  v_open := v_appt.deposit_status IN ('pending', 'requested');
  v_locked := v_appt.deposit_status IN ('paid', 'verified', 'refunded');

  PERFORM set_config('app.deposit_change', 'on', true);

  IF v_locked THEN
    IF p_deposit_type IS DISTINCT FROM v_appt.deposit_type
       OR p_deposit_value IS DISTINCT FROM v_appt.deposit_value
       OR p_deposit_due_at IS DISTINCT FROM v_appt.deposit_due_at THEN
      RAISE EXCEPTION 'deposit_locked';
    END IF;
  ELSIF p_deposit_type IS NULL THEN
    IF v_open THEN
      UPDATE public.appointments
      SET deposit_amount = NULL, deposit_status = NULL, deposit_waived = true,
          deposit_type = NULL, deposit_value = NULL, deposit_due_at = NULL,
          status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END
      WHERE id = p_appointment_id;
    END IF;
  ELSE
    IF v_appt.status IN ('cancelled', 'no_show', 'completed') THEN
      RAISE EXCEPTION 'deposit_not_allowed';
    END IF;
    IF p_deposit_type NOT IN ('fixed', 'percent') OR p_deposit_value IS NULL OR p_deposit_value <= 0
       OR (p_deposit_type = 'percent' AND p_deposit_value > 100) THEN
      RAISE EXCEPTION 'invalid_deposit';
    END IF;
    IF p_deposit_type = 'fixed' AND v_price IS NOT NULL AND p_deposit_value > v_price THEN
      RAISE EXCEPTION 'deposit_above_price';
    END IF;
    v_amount := public.deposit_amount_for(p_deposit_type, p_deposit_value, v_price);
    IF v_amount IS NULL THEN
      RAISE EXCEPTION 'invalid_deposit';
    END IF;
    UPDATE public.appointments
    SET deposit_type = p_deposit_type, deposit_value = p_deposit_value,
        deposit_amount = v_amount, deposit_due_at = p_deposit_due_at, deposit_waived = false,
        deposit_status = CASE WHEN v_open THEN deposit_status ELSE 'pending' END
    WHERE id = p_appointment_id;
  END IF;

  UPDATE public.appointments
  SET price_charged = p_price,
      payment_terms = NULLIF(btrim(COALESCE(p_payment_terms, '')), ''),
      terms_updated_by = auth.uid(),
      terms_updated_at = now()
  WHERE id = p_appointment_id;

  PERFORM set_config('app.deposit_change', 'off', true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_appointment_terms(UUID, NUMERIC, TEXT, NUMERIC, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_appointment_terms(UUID, NUMERIC, TEXT, NUMERIC, TIMESTAMPTZ, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. The dashboard view and the public booking carry the new columns
--    (bodies copied from production; only the new lines are added)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE VIEW public.appointments_with_details
WITH (security_invoker = true) AS
 SELECT a.id,
    a.organization_id,
    a.appointment_number,
    a.customer_id,
    a.service_id,
    a.staff_id,
    a.appointment_date,
    a.start_time,
    a.end_time,
    a.timezone,
    a.actual_start_time,
    a.actual_end_time,
    a.status,
    a.source,
    a.confirmation_sent_at,
    a.reminder_sent_at,
    a.client_confirmed_at,
    a.reminder_method,
    a.notes,
    a.internal_notes,
    a.cancellation_reason,
    a.cancelled_by,
    a.cancelled_at,
    a.price_charged,
    a.was_paid,
    a.payment_method,
    a.rating,
    a.feedback,
    a.created_by,
    a.created_at,
    a.updated_at,
    c.first_name AS customer_first_name,
    c.last_name AS customer_last_name,
    c.phone AS customer_phone,
    c.email AS customer_email,
    s.name AS service_name,
    s.duration_minutes,
    s.price AS service_price,
    st.first_name AS staff_first_name,
    st.last_name AS staff_last_name,
    st.nickname AS staff_nickname,
    o.name AS organization_name,
    o.timezone AS organization_timezone,
    a.deposit_amount,
    a.deposit_status,
    a.deposit_waived,
    a.deposit_verified_by,
    a.deposit_verified_at,
    a.deposit_type,
    a.deposit_value,
    a.deposit_due_at,
    a.payment_terms,
    a.terms_updated_by,
    a.terms_updated_at
   FROM appointments a
     JOIN customers c ON a.customer_id = c.id
     JOIN services s ON a.service_id = s.id
     LEFT JOIN staff_members st ON a.staff_id = st.id
     JOIN organizations o ON a.organization_id = o.id;

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
  v_services JSONB;
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

  v_services := COALESCE((
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
          'category_id', CASE WHEN COALESCE(c.is_active, true) THEN s.category_id END,
          'badge', s.badge,
          'requires_approval', COALESCE(s.requires_approval, false),
          'deposit_amount', public.service_deposit_amount(s.id),
          'deposit_due_hours', s.deposit_due_hours,
          'payment_terms', s.payment_terms,
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
      LEFT JOIN public.service_categories c ON c.id = s.category_id
      WHERE s.organization_id = v_org_id
        AND COALESCE(s.is_active, false)
        AND COALESCE(s.available_for_online_booking, false)
    ) listed
    WHERE svc -> 'staff_ids' <> 'null'::JSONB
  ), '[]'::JSONB);

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
    'services', v_services,
    'categories', COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'id', c.id,
          'name', c.name,
          'description', NULLIF(btrim(c.description), '')
        )
        ORDER BY COALESCE(c.sort_order, 0), c.name
      )
      FROM public.service_categories c
      WHERE c.organization_id = v_org_id
        AND COALESCE(c.is_active, true)
        AND EXISTS (
          SELECT 1 FROM jsonb_array_elements(v_services) x
          WHERE x ->> 'category_id' = c.id::TEXT
        )
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

CREATE OR REPLACE FUNCTION public.create_public_booking(p_org_id uuid, p_service_id uuid, p_staff_id uuid, p_date date, p_start time without time zone, p_first_name text, p_last_name text, p_phone text, p_email text, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_deposit NUMERIC(10,2);
  v_due TIMESTAMPTZ;
  v_terms TEXT;
BEGIN
  -- Serialize web bookings per organization: prevents two bookings on the
  -- same time and the MAX()+1 race of generate_appointment_number.
  PERFORM pg_advisory_xact_lock(hashtextextended('public_booking:' || p_org_id::TEXT, 0));

  IF NOT public.public_booking_org_open(p_org_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'booking_closed');
  END IF;

  v_phone_key := public.booking_phone_key(p_phone, NULL);
  IF btrim(COALESCE(p_first_name, '')) = ''
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

  -- Reuse the customer by phone (active first, then most recent);
  -- existing data is never overwritten.
  SELECT c.id INTO v_customer_id
  FROM public.customers c
  WHERE c.organization_id = p_org_id
    AND public.booking_phone_key(c.phone, c.phone_country_code) = v_phone_key
  ORDER BY c.is_active DESC NULLS LAST, c.created_at DESC NULLS LAST
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    INSERT INTO public.customers (
      organization_id, first_name, last_name, phone, email, is_active
    )
    VALUES (
      p_org_id,
      btrim(p_first_name),
      btrim(COALESCE(p_last_name, '')),
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
  -- The deposit trigger may hold the booking as pending: report what was saved
  RETURNING id, appointment_number, status, deposit_amount, deposit_due_at, payment_terms
    INTO v_appointment_id, v_appointment_number, v_status, v_deposit, v_due, v_terms;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment_id,
    'appointment_number', v_appointment_number,
    'status', v_status,
    'deposit_amount', v_deposit,
    'deposit_due_at', v_due,
    'payment_terms', v_terms,
    'deposit_instructions', CASE WHEN v_deposit IS NOT NULL THEN (
      SELECT bs.deposit_instructions FROM public.business_settings bs
      WHERE bs.organization_id = p_org_id) END,
    'staff_id', v_staff_id,
    'date', p_date,
    'start_time', p_start
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_public_booking_once(p_request_key uuid, p_org_id uuid, p_service_id uuid, p_staff_id uuid, p_date date, p_start time without time zone, p_first_name text, p_last_name text, p_phone text, p_email text, p_notes text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_existing public.appointments%ROWTYPE;
  v_result JSONB;
BEGIN
  IF p_request_key IS NOT NULL THEN
    -- Two retries with the same key wait for each other here; the second one
    -- then sees the committed booking.
    PERFORM pg_advisory_xact_lock(hashtextextended('booking_request:' || p_request_key::TEXT, 0));

    SELECT * INTO v_existing
    FROM public.appointments
    WHERE organization_id = p_org_id AND booking_request_key = p_request_key;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'appointment_id', v_existing.id,
        'appointment_number', v_existing.appointment_number,
        'status', v_existing.status,
        'deposit_amount', v_existing.deposit_amount,
        'deposit_due_at', v_existing.deposit_due_at,
        'payment_terms', v_existing.payment_terms,
        'deposit_instructions', CASE WHEN v_existing.deposit_amount IS NOT NULL THEN (
          SELECT bs.deposit_instructions FROM public.business_settings bs
          WHERE bs.organization_id = p_org_id) END,
        'staff_id', v_existing.staff_id,
        'date', v_existing.appointment_date,
        'start_time', v_existing.start_time
      );
    END IF;
  END IF;

  v_result := public.create_public_booking(
    p_org_id, p_service_id, p_staff_id, p_date, p_start,
    p_first_name, p_last_name, p_phone, p_email, p_notes
  );

  IF p_request_key IS NOT NULL AND (v_result ->> 'success')::BOOLEAN THEN
    UPDATE public.appointments
    SET booking_request_key = p_request_key
    WHERE id = (v_result ->> 'appointment_id')::UUID;
  END IF;

  RETURN v_result;
END;
$function$;
