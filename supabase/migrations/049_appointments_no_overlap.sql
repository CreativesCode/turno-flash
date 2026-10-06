-- ============================================
-- 049: No overlapping live appointments for the same professional (QA plan P0-08)
-- ============================================
-- The dashboard checked overlaps only in the browser, so a double tap or a
-- dashboard save racing a public booking could create two appointments for the
-- same professional at the same time. The public RPC (029) serializes with an
-- advisory lock, but the dashboard inserts directly. This constraint is the one
-- place both paths share.
--
-- Back-to-back appointments (09:00-09:30 and 09:30-10:00) are allowed: tsrange
-- is half-open, [start, end).

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;

ALTER TABLE public.appointments
  ADD CONSTRAINT appointments_staff_no_overlap
  EXCLUDE USING gist (
    staff_id WITH =,
    tsrange(appointment_date + start_time, appointment_date + end_time) WITH &&
  )
  WHERE (
    staff_id IS NOT NULL
    AND status IN ('pending', 'confirmed', 'reminded', 'client_confirmed', 'checked_in', 'in_progress')
  );
