-- ============================================
-- 051: Appointment reminders in the business timezone (QA plan P0-13, P0-19)
-- ============================================
-- 014 cast (date + time) straight to timestamptz, i.e. read the appointment's
-- wall-clock time as UTC: in Havana the "1 hour before" reminder went out at
-- night or not at all. It also:
--   - reminded 'pending' requests (and wa-send then moved them to 'reminded',
--     hiding the "Aprobar" button);
--   - skipped the 1 h reminder because the 24 h one had already set
--     reminder_sent_at. wa-send already dedups per intent, so that filter goes.
-- And it now honours business_settings.enable_reminders.

CREATE OR REPLACE FUNCTION public.wa_appointments_in_window(
  p_start TIMESTAMPTZ,
  p_end TIMESTAMPTZ
)
RETURNS TABLE (
  id UUID,
  organization_id UUID,
  appointment_date DATE,
  start_time TIME,
  status public.appointment_status,
  reminder_sent_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    a.id,
    a.organization_id,
    a.appointment_date,
    a.start_time,
    a.status,
    a.reminder_sent_at
  FROM public.appointments a
  JOIN public.organizations o ON o.id = a.organization_id
  LEFT JOIN public.business_settings bs ON bs.organization_id = a.organization_id
  WHERE
    a.status IN ('confirmed', 'reminded', 'client_confirmed')
    AND COALESCE(bs.enable_reminders, true)
    AND (a.appointment_date + a.start_time) AT TIME ZONE COALESCE(o.timezone, 'UTC')
        BETWEEN p_start AND p_end;
$$;
