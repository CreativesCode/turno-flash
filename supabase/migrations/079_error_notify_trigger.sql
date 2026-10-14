-- ============================================
-- 079: WhatsApp the platform admins when a new error is logged
-- ============================================
-- Every new row in error_logs calls the Edge Function error-notify through
-- pg_net, the same way the appointment triggers call wa-send (016). The
-- function sends the message to ERROR_NOTIFY_PHONES from the platform session.
--
-- Repeats of the same error within 24 hours never reach this trigger:
-- increment_error_count() (065, BEFORE INSERT) counts them on the existing
-- row and returns NULL, so no AFTER INSERT fires. Nothing here can make the
-- original insert fail.

CREATE OR REPLACE FUNCTION public.notify_error_log()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url TEXT;
  v_service_key TEXT;
  v_req_id BIGINT;
BEGIN
  SELECT value INTO v_supabase_url
    FROM public.app_config WHERE key = 'SUPABASE_URL';
  SELECT value INTO v_service_key
    FROM public.app_config WHERE key = 'SUPABASE_SERVICE_ROLE_KEY';

  IF v_supabase_url IS NULL OR v_service_key IS NULL THEN
    RAISE WARNING 'error-notify: app_config falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY';
    RETURN NEW;
  END IF;

  SELECT net.http_post(
    url := v_supabase_url || '/functions/v1/error-notify',
    body := jsonb_build_object('errorLogId', NEW.id),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_service_key
    )
  ) INTO v_req_id;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'error-notify trigger failed for error_log %: % (SQLSTATE %)',
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_error_log() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_error_log_notify ON public.error_logs;
CREATE TRIGGER trg_error_log_notify
  AFTER INSERT ON public.error_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_error_log();
