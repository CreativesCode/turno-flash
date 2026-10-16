-- 086: visible hours of the Day and Week calendar, per business (TUR0002, asked by Espiral Studio).
--
-- The dashboard calendar always drew 08:00 to 20:00 (BUSINESS_HOURS in config/constants.ts).
-- A business that closes at 14:00 scrolls through six empty hours every day. The owner now
-- picks the first and last hour row in Ajustes; both default to what everyone sees today, so
-- nothing changes for existing businesses. Whole hours only: the grid has one row per hour.
-- The client still widens the grid when an appointment falls outside the chosen range.
-- RLS stays as is: every member of the org can read business_settings, owner/admin write.

ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS calendar_start_hour SMALLINT NOT NULL DEFAULT 8,
  ADD COLUMN IF NOT EXISTS calendar_end_hour SMALLINT NOT NULL DEFAULT 20;

ALTER TABLE public.business_settings
  DROP CONSTRAINT IF EXISTS business_settings_calendar_hours_check;

ALTER TABLE public.business_settings
  ADD CONSTRAINT business_settings_calendar_hours_check
  CHECK (
    calendar_start_hour BETWEEN 0 AND 23
    AND calendar_end_hour BETWEEN 0 AND 23
    AND calendar_start_hour < calendar_end_hour
  );

COMMENT ON COLUMN public.business_settings.calendar_start_hour IS
  'First hour row (0-23) drawn by the Day/Week calendar of the dashboard. Default 8.';
COMMENT ON COLUMN public.business_settings.calendar_end_hour IS
  'Last hour row (0-23, after calendar_start_hour) drawn by the Day/Week calendar. Default 20.';
