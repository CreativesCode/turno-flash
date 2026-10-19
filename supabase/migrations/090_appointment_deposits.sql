-- 090: deposits on appointments (TUR0003, PRP-006).
--
-- A service can ask for a deposit, fixed or a percentage of its price. The amount is computed and
-- saved when the appointment is created, and the appointment stays pending until the owner
-- verifies the deposit; verifying (or waiving it) confirms the appointment. The client is told
-- by WhatsApp (requested), can answer "ya pagué" (paid), and cancelling an unpaid appointment
-- marks the deposit cancelled. A verified deposit of a cancelled appointment can be refunded.
-- Services without a deposit behave exactly as before.

-- ---------------------------------------------------------------------------
-- 1. Columns
-- ---------------------------------------------------------------------------
DO $type$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_deposit_status') THEN
    CREATE TYPE public.appointment_deposit_status AS ENUM (
      'pending', 'requested', 'paid', 'verified', 'cancelled', 'refunded'
    );
  END IF;
END $type$;

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS deposit_type TEXT,
  ADD COLUMN IF NOT EXISTS deposit_value NUMERIC(10,2);

ALTER TABLE public.services DROP CONSTRAINT IF EXISTS services_deposit_check;
ALTER TABLE public.services ADD CONSTRAINT services_deposit_check CHECK (
  (deposit_type IS NULL AND deposit_value IS NULL)
  OR (deposit_type = 'fixed' AND deposit_value > 0 AND deposit_value <= price)
  OR (deposit_type = 'percent' AND deposit_value > 0 AND deposit_value <= 100)
);

COMMENT ON COLUMN public.services.deposit_type IS
  'Deposit asked to book this service: fixed (an amount) or percent (of the price). NULL = none.';
COMMENT ON COLUMN public.services.deposit_value IS
  'Amount (fixed) or percentage 1-100 (percent) of the deposit.';

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC(10,2) CHECK (deposit_amount > 0),
  ADD COLUMN IF NOT EXISTS deposit_status public.appointment_deposit_status,
  ADD COLUMN IF NOT EXISTS deposit_waived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deposit_verified_at TIMESTAMPTZ;

COMMENT ON COLUMN public.appointments.deposit_amount IS
  'Deposit computed from the service when the appointment was created. NULL = no deposit.';
COMMENT ON COLUMN public.appointments.deposit_waived IS
  'The owner waived the deposit of this appointment.';

-- ---------------------------------------------------------------------------
-- 2. The amount a service asks for
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.service_deposit_amount(p_service_id UUID)
RETURNS NUMERIC(10,2)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT NULLIF(
    CASE s.deposit_type
      WHEN 'fixed' THEN s.deposit_value
      WHEN 'percent' THEN ROUND(COALESCE(s.price, 0) * s.deposit_value / 100)
    END, 0)
  FROM public.services s
  WHERE s.id = p_service_id;
$function$;

-- ---------------------------------------------------------------------------
-- 3. New appointments: compute the deposit and hold the appointment until it is verified.
--    An owner or admin loading it from the dashboard may mark it already verified (cash in
--    hand) or waive it; anyone else (staff, the public page) gets a pending deposit.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_appointment_deposit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_amount NUMERIC(10,2);
  v_manager BOOLEAN := COALESCE(public.auth_user_role() IN ('owner', 'admin'), false);
BEGIN
  v_amount := public.service_deposit_amount(NEW.service_id);
  NEW.deposit_verified_by := NULL;
  NEW.deposit_verified_at := NULL;

  IF v_amount IS NULL OR (NEW.deposit_waived AND v_manager) THEN
    NEW.deposit_amount := NULL;
    NEW.deposit_status := NULL;
    NEW.deposit_waived := v_amount IS NOT NULL;
    RETURN NEW;
  END IF;

  NEW.deposit_amount := v_amount;
  NEW.deposit_waived := false;

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

DROP TRIGGER IF EXISTS trg_compute_appointment_deposit ON public.appointments;
CREATE TRIGGER trg_compute_appointment_deposit
  BEFORE INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.compute_appointment_deposit();

-- ---------------------------------------------------------------------------
-- 4. Updates: the deposit only changes through set_appointment_deposit() or the WhatsApp
--    functions (service role); an unverified deposit keeps the appointment pending; cancelling
--    an unpaid appointment cancels its deposit.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_appointment_deposit()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  -- COALESCE: an unset setting is NULL, and NOT NULL would let the change through
  v_allowed BOOLEAN := COALESCE(current_setting('app.deposit_change', true) = 'on', false)
    OR COALESCE(auth.role() = 'service_role', false);
BEGIN
  IF NOT v_allowed AND (
    NEW.deposit_amount IS DISTINCT FROM OLD.deposit_amount
    OR NEW.deposit_status IS DISTINCT FROM OLD.deposit_status
    OR NEW.deposit_waived IS DISTINCT FROM OLD.deposit_waived
    OR NEW.deposit_verified_by IS DISTINCT FROM OLD.deposit_verified_by
    OR NEW.deposit_verified_at IS DISTINCT FROM OLD.deposit_verified_at
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

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_guard_appointment_deposit ON public.appointments;
CREATE TRIGGER trg_guard_appointment_deposit
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.guard_appointment_deposit();

-- ---------------------------------------------------------------------------
-- 5. What the owner or admin does with a deposit. SECURITY INVOKER: RLS (and the license
--    policy of 087) decide which appointments the caller reaches.
--    verify: pending/requested/paid -> verified, confirms a pending appointment
--    waive:  pending/requested/paid -> no deposit, confirms a pending appointment
--    refund: verified, appointment cancelled or no-show -> refunded
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_appointment_deposit(p_appointment_id UUID, p_action TEXT)
RETURNS public.appointment_deposit_status
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_appt public.appointments%ROWTYPE;
BEGIN
  IF NOT COALESCE(public.auth_user_role() IN ('owner', 'admin'), false) THEN
    RAISE EXCEPTION 'deposit_forbidden';
  END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE id = p_appointment_id FOR UPDATE;
  IF NOT FOUND OR v_appt.deposit_amount IS NULL THEN
    RAISE EXCEPTION 'deposit_not_found';
  END IF;

  PERFORM set_config('app.deposit_change', 'on', true);

  IF p_action = 'verify' AND v_appt.deposit_status IN ('pending', 'requested', 'paid') THEN
    UPDATE public.appointments
    SET deposit_status = 'verified',
        deposit_verified_by = auth.uid(),
        deposit_verified_at = now(),
        status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END
    WHERE id = p_appointment_id;
  ELSIF p_action = 'waive' AND v_appt.deposit_status IN ('pending', 'requested', 'paid') THEN
    UPDATE public.appointments
    SET deposit_amount = NULL,
        deposit_status = NULL,
        deposit_waived = true,
        status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END
    WHERE id = p_appointment_id;
  ELSIF p_action = 'refund' AND v_appt.deposit_status = 'verified'
        AND v_appt.status IN ('cancelled', 'no_show') THEN
    UPDATE public.appointments SET deposit_status = 'refunded' WHERE id = p_appointment_id;
  ELSE
    RAISE EXCEPTION 'deposit_invalid_transition';
  END IF;

  PERFORM set_config('app.deposit_change', 'off', true);

  RETURN (SELECT deposit_status FROM public.appointments WHERE id = p_appointment_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_appointment_deposit(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_appointment_deposit(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Public booking: the deposit of each service, and what the booking saved
--    (bodies copied from production; only the deposit lines are new)
-- ---------------------------------------------------------------------------

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
  RETURNING id, appointment_number, status, deposit_amount
    INTO v_appointment_id, v_appointment_number, v_status, v_deposit;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment_id,
    'appointment_number', v_appointment_number,
    'status', v_status,
    'deposit_amount', v_deposit,
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
