-- 092: WhatsApp for appointment deposits (TUR0003, PRP-006).
--
-- (1) Two new message intents: the customer says they paid (ack to them, notice to the business).
-- (2) The deposit guard of 090 recognised the edge functions only by auth.role(), which reads the
--     JWT claims; with the new sb_secret_ service keys there may be none. It now also accepts the
--     database role the request runs as.

ALTER TYPE public.wa_outbound_intent ADD VALUE IF NOT EXISTS 'deposit_paid_ack';
ALTER TYPE public.wa_outbound_intent ADD VALUE IF NOT EXISTS 'notify_business_deposit_paid';

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
