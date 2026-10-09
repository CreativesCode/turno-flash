-- P3-19: small backend fixes.

-- 1. The business was told "new appointment" on WhatsApp even for the ones it
--    loaded itself. Only bookings from the public page notify now. Live
--    definition with that single change.
CREATE OR REPLACE FUNCTION public.trigger_wa_send_on_appointment()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_wa_enabled BOOLEAN;
  v_session_id TEXT;
  v_req_id BIGINT;
BEGIN
  -- ¿WhatsApp habilitado para esta org?
  SELECT whatsapp_integration_enabled, openwa_session_id
    INTO v_wa_enabled, v_session_id
  FROM public.business_settings
  WHERE organization_id = NEW.organization_id;

  IF v_wa_enabled IS NOT TRUE THEN
    RAISE NOTICE 'wa-send: skip appointment % (WA not enabled for org %)',
      NEW.id, NEW.organization_id;
    RETURN NEW;
  END IF;

  IF v_session_id IS NULL OR v_session_id = '' THEN
    RAISE NOTICE 'wa-send: skip appointment % (no openwa_session_id for org %)',
      NEW.id, NEW.organization_id;
    RETURN NEW;
  END IF;

  -- Credenciales para invocar Edge Function
  SELECT value INTO v_supabase_url
    FROM public.app_config WHERE key = 'SUPABASE_URL';
  SELECT value INTO v_service_key
    FROM public.app_config WHERE key = 'SUPABASE_SERVICE_ROLE_KEY';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'wa-send: app_config falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY';
    RETURN NEW;
  END IF;

  -- Confirmación al cliente
  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/wa-send',
    body := jsonb_build_object(
      'appointmentId', NEW.id,
      'intent', 'confirm'
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  ) INTO v_req_id;

  RAISE NOTICE 'wa-send: queued confirm for appointment % (req=%)',
    NEW.id, v_req_id;

  -- Notificación al negocio: solo por reservas que llegan de la página
  -- pública. Las que carga el propio negocio no necesitan aviso.
  IF NEW.source = 'web' THEN
    SELECT net.http_post(
      url := v_supabase_url || '/functions/v1/wa-send',
      body := jsonb_build_object(
        'appointmentId', NEW.id,
        'intent', 'notify_business_new'
      ),
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      )
    ) INTO v_req_id;

    RAISE NOTICE 'wa-send: queued notify_business_new for appointment % (req=%)',
      NEW.id, v_req_id;
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Loguear el SQLERRM real (antes era opaco)
    RAISE WARNING 'wa-send trigger failed for appointment %: % (SQLSTATE %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$function$;

-- 2. Appointment and trip booking numbers were MAX + 1 with nothing stopping
--    two simultaneous inserts from taking the same number. A per-organization
--    transaction lock serializes them, and a unique index guarantees it.
CREATE OR REPLACE FUNCTION public.generate_appointment_number(org_id uuid)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
  next_number INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('appointment_number:' || org_id::text));

  SELECT COALESCE(MAX(CAST(SUBSTRING(appointment_number FROM '\d+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM appointments
  WHERE organization_id = org_id;

  RETURN 'T-' || LPAD(next_number::TEXT, 4, '0');
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_trip_booking_number(p_org_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  next_number INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('trip_booking_number:' || p_org_id::text));

  SELECT COALESCE(MAX(CAST(SUBSTRING(booking_number FROM '\d+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.trip_bookings
  WHERE organization_id = p_org_id;

  RETURN 'V-' || LPAD(next_number::TEXT, 4, '0');
END;
$function$;

CREATE UNIQUE INDEX IF NOT EXISTS appointments_org_number_key
  ON public.appointments (organization_id, appointment_number);

CREATE UNIQUE INDEX IF NOT EXISTS trip_bookings_org_number_key
  ON public.trip_bookings (organization_id, booking_number);

-- 3. Public bookings look a customer up by booking_phone_key(phone, country):
--    without an index that scanned every customer of the business.
CREATE INDEX IF NOT EXISTS idx_customers_phone_key
  ON public.customers (organization_id, public.booking_phone_key(phone, phone_country_code));
