-- ============================================
-- 031: Atomic save of a staff member's weekly schedule and services
-- ============================================
-- Used by the dashboard (StaffScheduleService.save). Replaces the staff
-- member's staff_availability rows and syncs staff_services in one
-- transaction, so a failure never leaves a half-saved schedule.
--
-- SECURITY INVOKER on purpose: the existing RLS policies (owner/admin of the
-- staff member's organization, usable license from 027) decide who can write.
-- A caller without permission gets an RLS error and nothing changes.

CREATE OR REPLACE FUNCTION public.save_staff_schedule(
  p_staff_id UUID,
  p_ranges JSONB,
  p_service_ids UUID[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
BEGIN
  SELECT m.organization_id INTO v_org_id
  FROM public.staff_members m
  WHERE m.id = p_staff_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Profesional no encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_ranges, '[]'::JSONB)) r
    WHERE (r ->> 'day_of_week')::INTEGER NOT BETWEEN 0 AND 6
       OR (r ->> 'start_time')::TIME >= (r ->> 'end_time')::TIME
  ) THEN
    RAISE EXCEPTION 'Tramo horario inválido' USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM unnest(COALESCE(p_service_ids, '{}'::UUID[])) sid
    WHERE NOT EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = sid AND s.organization_id = v_org_id
    )
  ) THEN
    RAISE EXCEPTION 'Servicio de otra organización' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.staff_availability WHERE staff_id = p_staff_id;

  INSERT INTO public.staff_availability (staff_id, day_of_week, start_time, end_time, is_available)
  SELECT p_staff_id,
         (r ->> 'day_of_week')::INTEGER,
         (r ->> 'start_time')::TIME,
         (r ->> 'end_time')::TIME,
         true
  FROM jsonb_array_elements(COALESCE(p_ranges, '[]'::JSONB)) r;

  DELETE FROM public.staff_services
  WHERE staff_id = p_staff_id
    AND NOT (service_id = ANY (COALESCE(p_service_ids, '{}'::UUID[])));

  INSERT INTO public.staff_services (staff_id, service_id)
  SELECT p_staff_id, sid
  FROM unnest(COALESCE(p_service_ids, '{}'::UUID[])) sid
  ON CONFLICT (staff_id, service_id) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_staff_schedule(UUID, JSONB, UUID[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_staff_schedule(UUID, JSONB, UUID[]) TO authenticated;

COMMENT ON FUNCTION public.save_staff_schedule IS
'Atomically replaces a staff member''s weekly schedule and service assignments (PRP-001). RLS applies (SECURITY INVOKER).';
