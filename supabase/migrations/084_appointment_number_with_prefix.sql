-- ============================================
-- 084: Appointment numbers carry the business prefix ("ES-0001")
-- ============================================
-- The WhatsApp code the customer types back (083) and the number the business
-- sees in the panel must be the same thing, or nobody can match them. New
-- appointments of a business with reply_prefix are numbered "<prefix>-0001";
-- businesses without one keep "T-0001". Existing numbers of prefixed
-- businesses are rewritten (same digits, new prefix), and changing a prefix
-- later renumbers that business the same way.

CREATE OR REPLACE FUNCTION public.generate_appointment_number(org_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  next_number INTEGER;
  v_prefix TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('appointment_number:' || org_id::text));

  SELECT COALESCE(reply_prefix, 'T') INTO v_prefix
  FROM public.organizations WHERE id = org_id;

  SELECT COALESCE(MAX(CAST(SUBSTRING(appointment_number FROM '\d+') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.appointments
  WHERE organization_id = org_id;

  RETURN COALESCE(v_prefix, 'T') || '-' || LPAD(next_number::TEXT, 4, '0');
END;
$function$;

-- Rewrite the numbers of one business to its current prefix (digits unchanged)
CREATE OR REPLACE FUNCTION public.renumber_appointments_for_prefix(org_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_prefix TEXT;
  v_count INTEGER;
BEGIN
  SELECT COALESCE(reply_prefix, 'T') INTO v_prefix
  FROM public.organizations WHERE id = org_id;

  UPDATE public.appointments
  SET appointment_number = v_prefix || '-' || SUBSTRING(appointment_number FROM '\d+')
  WHERE organization_id = org_id
    AND appointment_number ~ '^[A-Z]{1,4}-\d+$'
    AND appointment_number NOT LIKE v_prefix || '-%';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.renumber_appointments_for_prefix(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.on_reply_prefix_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.reply_prefix IS DISTINCT FROM OLD.reply_prefix THEN
    PERFORM public.renumber_appointments_for_prefix(NEW.id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_reply_prefix_renumber ON public.organizations;
CREATE TRIGGER trg_reply_prefix_renumber
  AFTER UPDATE OF reply_prefix ON public.organizations
  FOR EACH ROW
  EXECUTE FUNCTION public.on_reply_prefix_change();

-- Businesses that already have a prefix (083)
SELECT public.renumber_appointments_for_prefix(id)
FROM public.organizations
WHERE reply_prefix IS NOT NULL;
