-- P1-27: the error log did not work, so the pilot's failures would go unseen.
--
-- 1. increment_error_count() wrote "RETURNING id INTO NEW.id": when no
--    similar error existed it set NEW.id to NULL and every insert failed
--    (400, id NULL). It also failed with "more than one row" once several
--    duplicates matched. Now it uses a local variable, bumps only the most
--    recent match, and runs as definer so the dedup also works for staff.
CREATE OR REPLACE FUNCTION public.increment_error_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing uuid;
BEGIN
  SELECT id INTO v_existing
  FROM public.error_logs
  WHERE error_message = NEW.error_message
    AND (url = NEW.url OR (url IS NULL AND NEW.url IS NULL))
    AND timestamp > NOW() - INTERVAL '24 hours'
    AND resolved = FALSE
  ORDER BY timestamp DESC
  LIMIT 1;

  IF v_existing IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.error_logs
  SET error_count = error_count + 1,
      last_occurrence = NOW()
  WHERE id = v_existing;

  -- Counted on the existing row: skip the duplicate insert
  RETURN NULL;
END;
$$;

-- 2. Policies: the platform admin (no organization) only saw errors without
--    organization, and anyone could insert rows for any user or business.
DROP POLICY IF EXISTS "Admins can view error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Admins can update error logs" ON public.error_logs;
DROP POLICY IF EXISTS "Users can insert error logs" ON public.error_logs;

CREATE POLICY "error_logs_select" ON public.error_logs
  FOR SELECT TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      organization_id = public.auth_user_org_id()
      AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
      )
    )
  );

CREATE POLICY "error_logs_update" ON public.error_logs
  FOR UPDATE TO authenticated
  USING (
    public.is_platform_admin()
    OR (
      organization_id = public.auth_user_org_id()
      AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
      )
    )
  )
  WITH CHECK (
    public.is_platform_admin()
    OR (
      organization_id = public.auth_user_org_id()
      AND EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = auth.uid() AND role = 'owner' AND is_active = true
      )
    )
  );

CREATE POLICY "error_logs_insert_own" ON public.error_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (organization_id IS NULL OR organization_id = public.auth_user_org_id())
  );

-- 3. Internal functions callable by anyone with the public key
REVOKE EXECUTE ON FUNCTION public.cleanup_wa_processed_events() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.wa_appointments_in_window(timestamptz, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.generate_appointment_number(uuid) FROM PUBLIC, anon;
