-- ============================================
-- 050: Idempotent public bookings (QA plan P0-09)
-- ============================================
-- On Cuban mobile data the response of a booking is often lost after the
-- booking was created: the customer sees an error, retries, and gets
-- "slot taken" (by their own booking), "too many bookings", or a duplicate.
--
-- The page now sends a request key (a UUID created when the customer reaches
-- the details step). These wrappers return the booking already created with
-- that key instead of creating another one. They wrap the existing RPCs rather
-- than copying their ~150 lines each (same reason as the 039 window trigger).

ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS booking_request_key UUID;
ALTER TABLE public.trip_bookings ADD COLUMN IF NOT EXISTS booking_request_key UUID;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_booking_request_key_uq
  ON public.appointments (organization_id, booking_request_key)
  WHERE booking_request_key IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS trip_bookings_booking_request_key_uq
  ON public.trip_bookings (organization_id, booking_request_key)
  WHERE booking_request_key IS NOT NULL;

-- --------------------------------------------
-- Appointments
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.create_public_booking_once(
  p_request_key UUID,
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
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE EXECUTE ON FUNCTION public.create_public_booking_once(UUID, UUID, UUID, UUID, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_booking_once(UUID, UUID, UUID, UUID, DATE, TIME, TEXT, TEXT, TEXT, TEXT, TEXT) TO service_role;

-- --------------------------------------------
-- Trip seats
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.create_trip_booking_once(
  p_request_key UUID,
  p_org_id UUID,
  p_trip_id UUID,
  p_seats INTEGER,
  p_first_name TEXT,
  p_last_name TEXT,
  p_phone TEXT,
  p_email TEXT,
  p_notes TEXT,
  p_passenger_names TEXT[],
  p_pickup_point_id UUID DEFAULT NULL,
  p_round_trip BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing public.trip_bookings%ROWTYPE;
  v_result JSONB;
BEGIN
  IF p_request_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('booking_request:' || p_request_key::TEXT, 0));

    SELECT * INTO v_existing
    FROM public.trip_bookings
    WHERE organization_id = p_org_id AND booking_request_key = p_request_key;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', true,
        'booking_id', v_existing.id,
        'booking_number', v_existing.booking_number,
        'status', v_existing.status,
        'seats', v_existing.seats,
        'trip_type', v_existing.trip_type,
        'price_total', v_existing.price_total,
        'deposit_amount', v_existing.deposit_amount,
        'deposit_status', v_existing.deposit_status,
        'hold_expires_at', v_existing.hold_expires_at
      );
    END IF;
  END IF;

  v_result := public.create_trip_booking(
    p_org_id, p_trip_id, p_seats, p_first_name, p_last_name, p_phone,
    p_email, p_notes, p_passenger_names, p_pickup_point_id, p_round_trip
  );

  IF p_request_key IS NOT NULL AND (v_result ->> 'success')::BOOLEAN THEN
    UPDATE public.trip_bookings
    SET booking_request_key = p_request_key
    WHERE id = (v_result ->> 'booking_id')::UUID;
  END IF;

  RETURN v_result;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_trip_booking_once(UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID, BOOLEAN) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_trip_booking_once(UUID, UUID, UUID, INTEGER, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], UUID, BOOLEAN) TO service_role;
