-- 094: a booking made after the deposit deadline pays before the appointment (TUR0007).
--
-- 093 used GREATEST(deadline, now()): booking tomorrow's 09:00 with a 24 h deadline made the
-- deposit due "now", overdue right away. Decided (Claudia, 2026-10-21): the deadline becomes the
-- time of the appointment.

CREATE OR REPLACE FUNCTION public.deposit_due_from(
  p_date DATE, p_start TIME, p_tz TEXT, p_hours INTEGER
)
RETURNS TIMESTAMPTZ
LANGUAGE sql
STABLE
AS $function$
  WITH t AS (
    SELECT (p_date + p_start) AT TIME ZONE COALESCE(NULLIF(p_tz, ''), 'UTC') AS starts_at
  )
  SELECT CASE
    WHEN p_hours IS NULL THEN NULL
    WHEN t.starts_at - make_interval(hours => p_hours) < now() THEN t.starts_at
    ELSE t.starts_at - make_interval(hours => p_hours)
  END
  FROM t;
$function$;
