-- ============================================
-- 097: Cancellation reasons and refunds (TUR0010, PRP-010)
-- ============================================
-- - Cancelling from the dashboard needs a reason from a list (cancellation_category); "other"
--   needs the text. WhatsApp cancellations (service role) are not forced.
-- - business_settings.refunds_enabled: the business gives refunds (on by default).
-- - appointment_refunds: any part of what was paid, on a cancelled or no-show appointment.
--   Staff leave it pending; only an owner/admin processes or rejects it. Never edited or
--   deleted, never above what was paid. History in appointment_refund_events.
-- - Processed refunds covering the deposit mark it 'refunded'.
-- - The customer gets a WhatsApp when a refund is processed or rejected (switch of 096).

-- ---------------------------------------------------------------------------
-- 1. Cancellation reason
-- ---------------------------------------------------------------------------
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS cancellation_category TEXT;

ALTER TABLE public.appointments
  DROP CONSTRAINT IF EXISTS appointments_cancellation_category_check;
ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_cancellation_category_check CHECK (
    cancellation_category IS NULL
    OR (cancellation_category IN ('customer', 'business', 'deposit_unpaid')
        AND char_length(COALESCE(cancellation_reason, '')) <= 300)
    OR (cancellation_category = 'other'
        AND char_length(btrim(COALESCE(cancellation_reason, ''))) BETWEEN 1 AND 300)
  );

COMMENT ON COLUMN public.appointments.cancellation_category IS
  'Why it was cancelled (097): customer | business | deposit_unpaid | other (text in cancellation_reason).';

-- A member cancelling from the dashboard must say why
CREATE OR REPLACE FUNCTION public.require_cancellation_category()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'cancelled'
     AND OLD.status IS DISTINCT FROM 'cancelled'
     AND NEW.cancellation_category IS NULL
     AND COALESCE(auth.role(), '') = 'authenticated' THEN
    RAISE EXCEPTION 'cancellation_reason_required';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_require_cancellation_category ON public.appointments;
CREATE TRIGGER trg_require_cancellation_category
  BEFORE UPDATE OF status ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.require_cancellation_category();

-- ---------------------------------------------------------------------------
-- 2. Refunds: switch, tables, RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS refunds_enabled BOOLEAN NOT NULL DEFAULT true;

-- New values can't be used in this same transaction: the trigger below sends them as text
ALTER TYPE public.wa_outbound_intent ADD VALUE IF NOT EXISTS 'refund_processed';
ALTER TYPE public.wa_outbound_intent ADD VALUE IF NOT EXISTS 'refund_rejected';

DO $type$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_refund_status') THEN
    CREATE TYPE public.appointment_refund_status AS ENUM ('pending', 'processed', 'rejected');
  END IF;
END $type$;

CREATE TABLE IF NOT EXISTS public.appointment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  reason TEXT NOT NULL CHECK (char_length(btrim(reason)) BETWEEN 1 AND 300),
  method public.appointment_payment_method,
  method_other TEXT CHECK (char_length(method_other) <= 60),
  status public.appointment_refund_status NOT NULL DEFAULT 'pending',
  refunded_at TIMESTAMPTZ,
  rejection_reason TEXT CHECK (char_length(rejection_reason) <= 300),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  decided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  notice_sent_at TIMESTAMPTZ,
  CONSTRAINT appointment_refunds_processed_check CHECK (
    status <> 'processed' OR (method IS NOT NULL AND refunded_at IS NOT NULL)
  ),
  CONSTRAINT appointment_refunds_rejected_check CHECK (
    status <> 'rejected' OR NULLIF(btrim(rejection_reason), '') IS NOT NULL
  ),
  CONSTRAINT appointment_refunds_other_check CHECK (
    method IS DISTINCT FROM 'other' OR NULLIF(btrim(method_other), '') IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_appointment_refunds_appointment
  ON public.appointment_refunds (appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_refunds_org_status
  ON public.appointment_refunds (organization_id, status);

CREATE TABLE IF NOT EXISTS public.appointment_refund_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  refund_id UUID NOT NULL REFERENCES public.appointment_refunds(id) ON DELETE CASCADE,
  status public.appointment_refund_status NOT NULL,
  note TEXT CHECK (char_length(note) <= 300),
  changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointment_refund_events_refund
  ON public.appointment_refund_events (refund_id, changed_at);

COMMENT ON TABLE public.appointment_refunds IS
  'Refunds of an appointment (TUR0010). Written only by register_appointment_refund() and '
  'set_appointment_refund_status(); never edited or deleted.';
COMMENT ON TABLE public.appointment_refund_events IS
  'History of each refund: every status it went through, who and when (TUR0010).';

-- Members read their business; writes only through the functions below
ALTER TABLE public.appointment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_refund_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointment_refunds, public.appointment_refund_events FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON public.appointment_refunds, public.appointment_refund_events FROM authenticated;
GRANT SELECT ON public.appointment_refunds, public.appointment_refund_events TO authenticated;

DROP POLICY IF EXISTS "Members read refunds of their org" ON public.appointment_refunds;
CREATE POLICY "Members read refunds of their org" ON public.appointment_refunds
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT public.auth_user_org_id()));

DROP POLICY IF EXISTS "License must be usable" ON public.appointment_refunds;
CREATE POLICY "License must be usable" ON public.appointment_refunds
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.auth_org_usable()))
  WITH CHECK ((SELECT public.auth_org_usable()));

DROP POLICY IF EXISTS "Members read refund history of their org" ON public.appointment_refund_events;
CREATE POLICY "Members read refund history of their org" ON public.appointment_refund_events
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT public.auth_user_org_id()));

DROP POLICY IF EXISTS "License must be usable" ON public.appointment_refund_events;
CREATE POLICY "License must be usable" ON public.appointment_refund_events
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.auth_org_usable()))
  WITH CHECK ((SELECT public.auth_org_usable()));

-- ---------------------------------------------------------------------------
-- 3. Totals and the deposit
-- ---------------------------------------------------------------------------
-- Refunded (processed) or, with p_with_pending, also the ones waiting for a decision
CREATE OR REPLACE FUNCTION public.appointment_amount_refunded(
  p_appointment_id UUID,
  p_with_pending BOOLEAN DEFAULT false
)
RETURNS NUMERIC(10,2)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(r.amount), 0)
  FROM public.appointment_refunds r
  WHERE r.appointment_id = p_appointment_id
    AND (r.status = 'processed' OR (p_with_pending AND r.status = 'pending'));
$function$;

-- Processed refunds covering a deposit that was paid mark it 'refunded'
CREATE OR REPLACE FUNCTION public.refresh_deposit_refunded(p_appointment_id UUID)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.deposit_change', 'on', true);
  UPDATE public.appointments a
  SET deposit_status = 'refunded'
  WHERE a.id = p_appointment_id
    AND a.deposit_amount IS NOT NULL
    AND a.deposit_status IN ('paid', 'verified', 'cancelled')
    AND EXISTS (SELECT 1 FROM public.appointment_payments p
                WHERE p.appointment_id = a.id AND p.is_deposit AND p.voided_at IS NULL)
    AND public.appointment_amount_refunded(a.id) >= a.deposit_amount;
  PERFORM set_config('app.deposit_change', 'off', true);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.refresh_deposit_refunded(UUID) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Register a refund. Any member, as pending; an owner/admin may register it already
--    processed ("Ya la devolví").
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_appointment_refund(
  p_appointment_id UUID,
  p_amount NUMERIC,
  p_reason TEXT,
  p_method public.appointment_payment_method,
  p_method_other TEXT,
  p_processed BOOLEAN,
  p_refunded_at TIMESTAMPTZ
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org UUID := public.auth_user_org_id();
  v_manager BOOLEAN := COALESCE(public.auth_user_role() IN ('owner', 'admin'), false);
  v_processed BOOLEAN := COALESCE(p_processed, false);
  v_appt public.appointments%ROWTYPE;
  v_id UUID;
BEGIN
  IF v_org IS NULL OR NOT public.auth_org_usable() OR (v_processed AND NOT v_manager) THEN
    RAISE EXCEPTION 'refund_forbidden';
  END IF;

  SELECT * INTO v_appt FROM public.appointments
  WHERE id = p_appointment_id AND organization_id = v_org
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'refund_not_found';
  END IF;
  IF v_appt.status NOT IN ('cancelled', 'no_show') THEN
    RAISE EXCEPTION 'refund_not_cancelled';
  END IF;
  IF NOT COALESCE((SELECT bs.refunds_enabled FROM public.business_settings bs
                   WHERE bs.organization_id = v_org), true) THEN
    RAISE EXCEPTION 'refunds_disabled';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0
     OR public.appointment_amount_refunded(p_appointment_id, true) + p_amount
        > public.appointment_amount_paid(p_appointment_id) THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  IF NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL OR char_length(p_reason) > 300 THEN
    RAISE EXCEPTION 'invalid_reason';
  END IF;
  IF v_processed AND p_method IS NULL THEN
    RAISE EXCEPTION 'invalid_method';
  END IF;
  IF p_refunded_at IS NOT NULL AND p_refunded_at > now() + INTERVAL '1 day' THEN
    RAISE EXCEPTION 'invalid_refunded_at';
  END IF;

  INSERT INTO public.appointment_refunds (
    organization_id, appointment_id, amount, reason, method, method_other, status,
    refunded_at, created_by, decided_by, decided_at
  )
  VALUES (
    v_org, p_appointment_id, p_amount, btrim(p_reason), p_method,
    CASE WHEN p_method = 'other' THEN NULLIF(btrim(COALESCE(p_method_other, '')), '') END,
    CASE WHEN v_processed THEN 'processed' ELSE 'pending' END::public.appointment_refund_status,
    CASE WHEN v_processed THEN COALESCE(p_refunded_at, now()) END,
    auth.uid(),
    CASE WHEN v_processed THEN auth.uid() END,
    CASE WHEN v_processed THEN now() END
  )
  RETURNING id INTO v_id;

  INSERT INTO public.appointment_refund_events (organization_id, refund_id, status, changed_by)
  VALUES (v_org, v_id, CASE WHEN v_processed THEN 'processed' ELSE 'pending' END::public.appointment_refund_status,
          auth.uid());

  IF v_processed THEN
    PERFORM public.refresh_deposit_refunded(p_appointment_id);
  END IF;
  RETURN v_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.register_appointment_refund(
  UUID, NUMERIC, TEXT, public.appointment_payment_method, TEXT, BOOLEAN, TIMESTAMPTZ
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_appointment_refund(
  UUID, NUMERIC, TEXT, public.appointment_payment_method, TEXT, BOOLEAN, TIMESTAMPTZ
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Process or reject a pending refund (owner or admin). Works with the switch off too.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_appointment_refund_status(
  p_refund_id UUID,
  p_status TEXT,
  p_note TEXT,
  p_method public.appointment_payment_method,
  p_method_other TEXT,
  p_refunded_at TIMESTAMPTZ
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org UUID := public.auth_user_org_id();
  v_refund public.appointment_refunds%ROWTYPE;
  v_note TEXT := NULLIF(btrim(COALESCE(p_note, '')), '');
BEGIN
  IF v_org IS NULL OR NOT public.auth_org_usable()
     OR NOT COALESCE(public.auth_user_role() IN ('owner', 'admin'), false) THEN
    RAISE EXCEPTION 'refund_forbidden';
  END IF;
  IF p_status NOT IN ('processed', 'rejected') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;
  IF char_length(v_note) > 300 OR (p_status = 'rejected' AND v_note IS NULL) THEN
    RAISE EXCEPTION 'invalid_reason';
  END IF;
  IF p_status = 'processed' AND p_method IS NULL THEN
    RAISE EXCEPTION 'invalid_method';
  END IF;
  IF p_refunded_at IS NOT NULL AND p_refunded_at > now() + INTERVAL '1 day' THEN
    RAISE EXCEPTION 'invalid_refunded_at';
  END IF;

  SELECT * INTO v_refund FROM public.appointment_refunds
  WHERE id = p_refund_id AND organization_id = v_org
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'refund_not_found';
  END IF;
  IF v_refund.status <> 'pending' THEN
    RAISE EXCEPTION 'refund_not_pending';
  END IF;

  IF p_status = 'processed' THEN
    UPDATE public.appointment_refunds
    SET status = 'processed',
        method = p_method,
        method_other = CASE WHEN p_method = 'other' THEN NULLIF(btrim(COALESCE(p_method_other, '')), '') END,
        refunded_at = COALESCE(p_refunded_at, now()),
        decided_by = auth.uid(),
        decided_at = now()
    WHERE id = p_refund_id;
  ELSE
    UPDATE public.appointment_refunds
    SET status = 'rejected', rejection_reason = v_note, decided_by = auth.uid(), decided_at = now()
    WHERE id = p_refund_id;
  END IF;

  INSERT INTO public.appointment_refund_events (organization_id, refund_id, status, note, changed_by)
  VALUES (v_org, p_refund_id, p_status::public.appointment_refund_status, v_note, auth.uid());

  IF p_status = 'processed' THEN
    PERFORM public.refresh_deposit_refunded(v_refund.appointment_id);
  END IF;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.set_appointment_refund_status(
  UUID, TEXT, TEXT, public.appointment_payment_method, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_appointment_refund_status(
  UUID, TEXT, TEXT, public.appointment_payment_method, TEXT, TIMESTAMPTZ
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Voiding a payment can't leave refunds above what was paid (095 + one check)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.void_appointment_payment(p_payment_id UUID, p_reason TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org UUID := public.auth_user_org_id();
  v_pay public.appointment_payments%ROWTYPE;
BEGIN
  IF v_org IS NULL OR NOT public.auth_org_usable()
     OR NOT COALESCE(public.auth_user_role() IN ('owner', 'admin'), false) THEN
    RAISE EXCEPTION 'payment_forbidden';
  END IF;
  IF NULLIF(btrim(COALESCE(p_reason, '')), '') IS NULL OR char_length(p_reason) > 300 THEN
    RAISE EXCEPTION 'invalid_reason';
  END IF;

  SELECT * INTO v_pay FROM public.appointment_payments
  WHERE id = p_payment_id AND organization_id = v_org
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;
  IF v_pay.voided_at IS NOT NULL THEN
    RAISE EXCEPTION 'payment_already_voided';
  END IF;
  IF public.appointment_amount_refunded(v_pay.appointment_id, true)
     > public.appointment_amount_paid(v_pay.appointment_id) - v_pay.amount THEN
    RAISE EXCEPTION 'payment_refunded';
  END IF;

  UPDATE public.appointment_payments
  SET voided_at = now(), voided_by = auth.uid(), void_reason = btrim(p_reason)
  WHERE id = p_payment_id;

  IF v_pay.is_deposit THEN
    UPDATE public.appointments
    SET deposit_status = 'pending', deposit_verified_by = NULL, deposit_verified_at = NULL
    WHERE id = v_pay.appointment_id AND deposit_status IN ('paid', 'verified');
  END IF;

  PERFORM public.refresh_appointment_was_paid(v_pay.appointment_id);
END;
$function$;

-- ---------------------------------------------------------------------------
-- 7. WhatsApp to the customer when a refund is processed or rejected
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trigger_wa_refund_notice()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_enabled BOOLEAN;
  v_supabase_url TEXT;
  v_service_key TEXT;
BEGIN
  IF NEW.status = 'pending' OR (TG_OP = 'UPDATE' AND OLD.status = NEW.status) THEN
    RETURN NEW;
  END IF;

  SELECT bs.enable_payment_reminders AND bs.whatsapp_integration_enabled
    INTO v_enabled
  FROM public.business_settings bs
  WHERE bs.organization_id = NEW.organization_id;
  IF v_enabled IS NOT TRUE THEN
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
      'intent', CASE WHEN NEW.status = 'processed' THEN 'refund_processed' ELSE 'refund_rejected' END,
      'refundId', NEW.id
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  );
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_wa_refund_notice ON public.appointment_refunds;
CREATE TRIGGER trg_wa_refund_notice
  AFTER INSERT OR UPDATE OF status ON public.appointment_refunds
  FOR EACH ROW EXECUTE FUNCTION public.trigger_wa_refund_notice();

-- ---------------------------------------------------------------------------
-- 8. The dashboard view: cancellation reason and refunds (new columns at the end, 091)
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
    a.terms_updated_at,
    pay.amount_paid,
    GREATEST(COALESCE(a.price_charged, s.price, 0) - pay.amount_paid, 0)::NUMERIC(10,2) AS amount_pending,
    CASE
      WHEN pay.amount_paid <= 0 THEN 'unpaid'
      WHEN pay.amount_paid >= COALESCE(a.price_charged, s.price, 0) THEN 'paid'
      ELSE 'partial'
    END AS payment_status,
    a.cancellation_category,
    ref.amount_refunded,
    ref.amount_refund_pending
   FROM appointments a
     JOIN customers c ON a.customer_id = c.id
     JOIN services s ON a.service_id = s.id
     LEFT JOIN staff_members st ON a.staff_id = st.id
     JOIN organizations o ON a.organization_id = o.id
     CROSS JOIN LATERAL (
       SELECT COALESCE(SUM(p.amount), 0)::NUMERIC(10,2) AS amount_paid
       FROM appointment_payments p
       WHERE p.appointment_id = a.id AND p.voided_at IS NULL
     ) pay
     CROSS JOIN LATERAL (
       SELECT COALESCE(SUM(r.amount) FILTER (WHERE r.status = 'processed'), 0)::NUMERIC(10,2) AS amount_refunded,
              COALESCE(SUM(r.amount) FILTER (WHERE r.status = 'pending'), 0)::NUMERIC(10,2) AS amount_refund_pending
       FROM appointment_refunds r
       WHERE r.appointment_id = a.id
     ) ref;
