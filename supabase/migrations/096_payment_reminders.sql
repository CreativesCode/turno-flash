-- ============================================
-- 096: Payment reminders and notices (TUR0009, PRP-009)
-- ============================================
-- - business_settings.enable_payment_reminders: one switch per business for the three notices
--   below (on by default). The booking message with the deposit, PAGUÉ and "Recibimos tu
--   anticipo" do not depend on it.
-- - 24 h before the deposit deadline: reminder to the customer (send-reminders, every 15 min).
-- - Deadline passed without payment: one notice to the customer and one to the business. The
--   appointment is not cancelled (PRP-007).
-- - Each payment registered in the panel: receipt to the customer (trigger below).
-- "Once per deadline" is read from wa_outbound_messages: a message sent before the current
-- deadline window does not count, so moving the deadline allows new notices.

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS enable_payment_reminders BOOLEAN NOT NULL DEFAULT true;

-- New values can't be used in this same transaction: the functions below compare intent::TEXT
ALTER TYPE public.wa_outbound_intent ADD VALUE IF NOT EXISTS 'deposit_due_reminder';
ALTER TYPE public.wa_outbound_intent ADD VALUE IF NOT EXISTS 'deposit_overdue';
ALTER TYPE public.wa_outbound_intent ADD VALUE IF NOT EXISTS 'notify_business_deposit_overdue';
ALTER TYPE public.wa_outbound_intent ADD VALUE IF NOT EXISTS 'payment_received';

-- Receipt sent for this payment (wa-send writes it with the service role; members only read)
ALTER TABLE public.appointment_payments
  ADD COLUMN IF NOT EXISTS ack_sent_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- 1. Deposits owed whose deadline is within the next 24 h. Only when the customer had more than
--    24 h to pay (otherwise the booking message already gave the deadline) and not yet reminded
--    for this deadline. A customer who said PAGUÉ ('paid') is not reminded.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wa_deposits_due_soon()
RETURNS TABLE (id UUID, organization_id UUID)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT a.id, a.organization_id
  FROM public.appointments a
  JOIN public.business_settings bs ON bs.organization_id = a.organization_id
  WHERE a.deposit_status IN ('pending', 'requested')
    AND a.status NOT IN ('cancelled', 'no_show', 'completed')
    AND a.deposit_due_at > now()
    AND a.deposit_due_at <= now() + INTERVAL '24 hours'
    AND a.created_at < a.deposit_due_at - INTERVAL '24 hours'
    AND bs.enable_payment_reminders
    AND bs.whatsapp_integration_enabled
    AND NOT EXISTS (
      SELECT 1 FROM public.wa_outbound_messages m
      WHERE m.appointment_id = a.id
        AND m.intent::TEXT = 'deposit_due_reminder'
        AND m.sent_at >= a.deposit_due_at - INTERVAL '24 hours'
    );
$$;

-- ---------------------------------------------------------------------------
-- 2. Deposits still owed whose deadline passed in the last 24 h (older ones are left alone, so
--    turning this on does not message every old overdue deposit), for appointments still to
--    come and not yet notified for this deadline.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.wa_deposits_overdue()
RETURNS TABLE (id UUID, organization_id UUID)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT a.id, a.organization_id
  FROM public.appointments a
  JOIN public.organizations o ON o.id = a.organization_id
  JOIN public.business_settings bs ON bs.organization_id = a.organization_id
  WHERE a.deposit_status IN ('pending', 'requested')
    AND a.status NOT IN ('cancelled', 'no_show', 'completed')
    AND a.deposit_due_at <= now()
    AND a.deposit_due_at > now() - INTERVAL '24 hours'
    AND (a.appointment_date + a.start_time) AT TIME ZONE COALESCE(a.timezone, o.timezone, 'UTC') > now()
    AND bs.enable_payment_reminders
    AND bs.whatsapp_integration_enabled
    AND NOT EXISTS (
      SELECT 1 FROM public.wa_outbound_messages m
      WHERE m.appointment_id = a.id
        AND m.intent::TEXT = 'deposit_overdue'
        AND m.sent_at >= a.deposit_due_at
    );
$$;

-- Only the cron (send-reminders, service role) reads these lists
REVOKE EXECUTE ON FUNCTION public.wa_deposits_due_soon() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.wa_deposits_overdue() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wa_deposits_due_soon() TO service_role;
GRANT EXECUTE ON FUNCTION public.wa_deposits_overdue() TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Receipt of each payment registered in the panel. Runs inside register_appointment_payment,
--    before it updates the appointment, so the row still has its previous state. Skipped when
--    an owner/admin registers the deposit of a pending appointment: that confirms it and the
--    customer already gets "Recibimos tu anticipo, tu turno está confirmado" (approved).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_wa_payment_received()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled BOOLEAN;
  v_appt public.appointments%ROWTYPE;
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  SELECT bs.enable_payment_reminders AND bs.whatsapp_integration_enabled
    INTO v_enabled
  FROM public.business_settings bs
  WHERE bs.organization_id = NEW.organization_id;
  IF v_enabled IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_appt FROM public.appointments WHERE id = NEW.appointment_id;
  IF NEW.is_deposit
     AND v_appt.status = 'pending'
     AND v_appt.deposit_status IS DISTINCT FROM 'verified'
     AND COALESCE(public.auth_user_role() IN ('owner', 'admin'), false) THEN
    RETURN NEW;
  END IF;

  SELECT value INTO v_supabase_url FROM public.app_config WHERE key = 'SUPABASE_URL';
  SELECT value INTO v_service_key FROM public.app_config WHERE key = 'SUPABASE_SERVICE_ROLE_KEY';
  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'wa-send: app_config falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY';
    RETURN NEW;
  END IF;

  PERFORM net.http_post(
    url := v_supabase_url || '/functions/v1/wa-send',
    body := jsonb_build_object(
      'appointmentId', NEW.appointment_id,
      'intent', 'payment_received',
      'paymentId', NEW.id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_wa_payment_received ON public.appointment_payments;
CREATE TRIGGER trg_wa_payment_received
  AFTER INSERT ON public.appointment_payments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_wa_payment_received();
