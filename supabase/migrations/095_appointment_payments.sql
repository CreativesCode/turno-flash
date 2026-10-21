-- 095: payments of each appointment (TUR0008, PRP-008).
--
-- Each appointment keeps the list of its payments, registered by hand: amount, date, method,
-- reference, notes and an optional receipt (private Storage). Partial payments add up; the deposit
-- is one more payment. A payment is never deleted: only an owner or admin voids it, with a reason,
-- and a voided payment stops counting. was_paid (reports, CSV) follows the payments.
-- Appointments without payments behave exactly as before.

-- ---------------------------------------------------------------------------
-- 1. Table
-- ---------------------------------------------------------------------------
DO $type$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_payment_method') THEN
    CREATE TYPE public.appointment_payment_method AS ENUM ('cash', 'transfer', 'card', 'other');
  END IF;
END $type$;

CREATE TABLE IF NOT EXISTS public.appointment_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  method public.appointment_payment_method NOT NULL,
  method_other TEXT CHECK (char_length(method_other) <= 60),
  reference TEXT CHECK (char_length(reference) <= 100),
  notes TEXT CHECK (char_length(notes) <= 500),
  receipt_path TEXT,
  is_deposit BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  voided_at TIMESTAMPTZ,
  voided_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  void_reason TEXT CHECK (char_length(void_reason) <= 300),
  CONSTRAINT appointment_payments_other_check CHECK (
    method <> 'other' OR NULLIF(btrim(method_other), '') IS NOT NULL
  ),
  CONSTRAINT appointment_payments_void_check CHECK (
    (voided_at IS NULL AND void_reason IS NULL)
    OR (voided_at IS NOT NULL AND NULLIF(btrim(void_reason), '') IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_appointment_payments_appointment
  ON public.appointment_payments (appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointment_payments_org_paid_at
  ON public.appointment_payments (organization_id, paid_at);
-- One active deposit payment per appointment
CREATE UNIQUE INDEX IF NOT EXISTS uq_appointment_payments_active_deposit
  ON public.appointment_payments (appointment_id) WHERE is_deposit AND voided_at IS NULL;

COMMENT ON TABLE public.appointment_payments IS
  'Payments of an appointment (TUR0008). Written only by register_appointment_payment() and '
  'void_appointment_payment(); never deleted, a voided payment stops counting.';

-- Members read the payments of their business; writes only through the functions below
ALTER TABLE public.appointment_payments ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.appointment_payments FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.appointment_payments FROM authenticated;
GRANT SELECT ON public.appointment_payments TO authenticated;

DROP POLICY IF EXISTS "Members read payments of their org" ON public.appointment_payments;
CREATE POLICY "Members read payments of their org" ON public.appointment_payments
  FOR SELECT TO authenticated
  USING (organization_id = (SELECT public.auth_user_org_id()));

DROP POLICY IF EXISTS "License must be usable" ON public.appointment_payments;
CREATE POLICY "License must be usable" ON public.appointment_payments
  AS RESTRICTIVE FOR ALL TO authenticated
  USING ((SELECT public.auth_org_usable()))
  WITH CHECK ((SELECT public.auth_org_usable()));

-- ---------------------------------------------------------------------------
-- 2. Receipts: private bucket, <organization>/<appointment>/<file>
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('appointment-receipts', 'appointment-receipts', false, 5242880,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
ON CONFLICT (id) DO UPDATE
  SET public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Members read receipts of their org" ON storage.objects;
CREATE POLICY "Members read receipts of their org" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'appointment-receipts'
    AND (storage.foldername(name))[1] = (SELECT public.auth_user_org_id())::TEXT
  );

DROP POLICY IF EXISTS "Members upload receipts of their org" ON storage.objects;
CREATE POLICY "Members upload receipts of their org" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'appointment-receipts'
    AND (storage.foldername(name))[1] = (SELECT public.auth_user_org_id())::TEXT
  );

DROP POLICY IF EXISTS "Receipts need a usable license" ON storage.objects;
CREATE POLICY "Receipts need a usable license" ON storage.objects
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (bucket_id <> 'appointment-receipts' OR (SELECT public.auth_org_usable()))
  WITH CHECK (bucket_id <> 'appointment-receipts' OR (SELECT public.auth_org_usable()));

-- ---------------------------------------------------------------------------
-- 3. Totals and was_paid
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.appointment_amount_paid(p_appointment_id UUID)
RETURNS NUMERIC(10,2)
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(p.amount), 0)
  FROM public.appointment_payments p
  WHERE p.appointment_id = p_appointment_id AND p.voided_at IS NULL;
$function$;

-- was_paid follows the payments once an appointment has any (the old manual flag of appointments
-- without payments is left alone). A price of 0 or none is paid by any payment.
CREATE OR REPLACE FUNCTION public.refresh_appointment_was_paid(p_appointment_id UUID)
RETURNS void
LANGUAGE sql
SET search_path TO 'public'
AS $function$
  UPDATE public.appointments a
  SET was_paid = public.appointment_amount_paid(a.id) > 0
       AND public.appointment_amount_paid(a.id) >= COALESCE(
             a.price_charged, (SELECT s.price FROM public.services s WHERE s.id = a.service_id), 0)
  WHERE a.id = p_appointment_id
    AND EXISTS (SELECT 1 FROM public.appointment_payments p WHERE p.appointment_id = a.id);
$function$;

REVOKE EXECUTE ON FUNCTION public.refresh_appointment_was_paid(UUID) FROM PUBLIC, anon, authenticated;

-- A new price (set_appointment_terms) can pay or unpay an appointment
CREATE OR REPLACE FUNCTION public.sync_appointment_was_paid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_paid NUMERIC(10,2);
BEGIN
  IF EXISTS (SELECT 1 FROM public.appointment_payments p WHERE p.appointment_id = NEW.id) THEN
    v_paid := public.appointment_amount_paid(NEW.id);
    NEW.was_paid := v_paid > 0 AND v_paid >= COALESCE(
      NEW.price_charged, (SELECT s.price FROM public.services s WHERE s.id = NEW.service_id), 0);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_appointment_was_paid ON public.appointments;
CREATE TRIGGER trg_sync_appointment_was_paid
  BEFORE UPDATE OF price_charged ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.sync_appointment_was_paid();

-- ---------------------------------------------------------------------------
-- 4. Register a payment (any member of the business). SECURITY DEFINER because members cannot
--    write the table: it checks the business, the license and the role itself.
--    A deposit payment: an owner or admin verifies the deposit (and confirms a pending
--    appointment), anyone else leaves it paid for the owner to verify. A deposit already verified
--    (by the old button, or "Ya lo cobré" when creating) only gets its payment recorded.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.register_appointment_payment(
  p_appointment_id UUID,
  p_amount NUMERIC,
  p_paid_at TIMESTAMPTZ,
  p_method public.appointment_payment_method,
  p_method_other TEXT,
  p_reference TEXT,
  p_notes TEXT,
  p_receipt_path TEXT,
  p_is_deposit BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_org UUID := public.auth_user_org_id();
  v_manager BOOLEAN := COALESCE(public.auth_user_role() IN ('owner', 'admin'), false);
  v_appt public.appointments%ROWTYPE;
  v_id UUID;
BEGIN
  IF v_org IS NULL OR NOT public.auth_org_usable() THEN
    RAISE EXCEPTION 'payment_forbidden';
  END IF;

  SELECT * INTO v_appt FROM public.appointments
  WHERE id = p_appointment_id AND organization_id = v_org
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'payment_not_found';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 99999999 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;
  IF p_paid_at IS NOT NULL AND p_paid_at > now() + INTERVAL '1 day' THEN
    RAISE EXCEPTION 'invalid_paid_at';
  END IF;
  IF p_receipt_path IS NOT NULL
     AND p_receipt_path NOT LIKE v_org::TEXT || '/' || p_appointment_id::TEXT || '/%' THEN
    RAISE EXCEPTION 'invalid_receipt';
  END IF;

  IF COALESCE(p_is_deposit, false) THEN
    IF v_appt.deposit_status IS NULL
       OR v_appt.deposit_status NOT IN ('pending', 'requested', 'paid', 'verified') THEN
      RAISE EXCEPTION 'deposit_not_open';
    END IF;
    IF EXISTS (SELECT 1 FROM public.appointment_payments p
               WHERE p.appointment_id = p_appointment_id AND p.is_deposit AND p.voided_at IS NULL) THEN
      RAISE EXCEPTION 'deposit_already_registered';
    END IF;
  END IF;

  INSERT INTO public.appointment_payments (
    organization_id, appointment_id, amount, paid_at, method, method_other,
    reference, notes, receipt_path, is_deposit, created_by
  )
  VALUES (
    v_org, p_appointment_id, p_amount, COALESCE(p_paid_at, now()), p_method,
    CASE WHEN p_method = 'other' THEN NULLIF(btrim(COALESCE(p_method_other, '')), '') END,
    NULLIF(btrim(COALESCE(p_reference, '')), ''),
    NULLIF(btrim(COALESCE(p_notes, '')), ''),
    p_receipt_path, COALESCE(p_is_deposit, false), auth.uid()
  )
  RETURNING id INTO v_id;

  IF COALESCE(p_is_deposit, false) AND v_appt.deposit_status <> 'verified' THEN
    IF v_manager THEN
      UPDATE public.appointments
      SET deposit_status = 'verified',
          deposit_verified_by = auth.uid(),
          deposit_verified_at = now(),
          status = CASE WHEN status = 'pending' THEN 'confirmed' ELSE status END
      WHERE id = p_appointment_id;
    ELSE
      UPDATE public.appointments SET deposit_status = 'paid' WHERE id = p_appointment_id;
    END IF;
  END IF;

  PERFORM public.refresh_appointment_was_paid(p_appointment_id);
  RETURN v_id;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.register_appointment_payment(
  UUID, NUMERIC, TIMESTAMPTZ, public.appointment_payment_method, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_appointment_payment(
  UUID, NUMERIC, TIMESTAMPTZ, public.appointment_payment_method, TEXT, TEXT, TEXT, TEXT, BOOLEAN
) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. Void a payment (owner or admin, with a reason). Voiding the deposit payment puts a paid or
--    verified deposit back to pending; the appointment keeps its status.
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

REVOKE EXECUTE ON FUNCTION public.void_appointment_payment(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.void_appointment_payment(UUID, TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Deposits verified before this migration get their payment, so the numbers add up
-- ---------------------------------------------------------------------------
INSERT INTO public.appointment_payments (
  organization_id, appointment_id, amount, paid_at, method, method_other, notes,
  is_deposit, created_by, created_at
)
SELECT a.organization_id, a.id, a.deposit_amount,
       COALESCE(a.deposit_verified_at, a.created_at, now()), 'other', 'Sin dato',
       'Anticipo verificado antes de registrar pagos', true, a.deposit_verified_by,
       COALESCE(a.deposit_verified_at, now())
FROM public.appointments a
WHERE a.deposit_status = 'verified'
  AND a.deposit_amount IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM public.appointment_payments p WHERE p.appointment_id = a.id);

UPDATE public.appointments a
SET was_paid = public.appointment_amount_paid(a.id) >= COALESCE(
      a.price_charged, (SELECT s.price FROM public.services s WHERE s.id = a.service_id), 0)
WHERE EXISTS (SELECT 1 FROM public.appointment_payments p WHERE p.appointment_id = a.id);

-- ---------------------------------------------------------------------------
-- 7. The dashboard view: paid, pending and payment status (new columns at the end, 091)
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
    END AS payment_status
   FROM appointments a
     JOIN customers c ON a.customer_id = c.id
     JOIN services s ON a.service_id = s.id
     LEFT JOIN staff_members st ON a.staff_id = st.id
     JOIN organizations o ON a.organization_id = o.id
     CROSS JOIN LATERAL (
       SELECT COALESCE(SUM(p.amount), 0)::NUMERIC(10,2) AS amount_paid
       FROM appointment_payments p
       WHERE p.appointment_id = a.id AND p.voided_at IS NULL
     ) pay;
