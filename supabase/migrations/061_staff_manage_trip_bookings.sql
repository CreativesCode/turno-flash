-- D-14: employees handle passengers day to day (load, approve, collect the
-- deposit, cancel), while departures stay with the owner. Staff get INSERT
-- and UPDATE on trip_bookings only; trips and trip_pickup_points keep their
-- owner/admin policies. Nothing deletes bookings, so no DELETE for staff.
-- The 'special' role is parked on purpose and is not included.

CREATE POLICY "Staff can add trip bookings of their org" ON public.trip_bookings
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'staff'
    )
    AND public.org_license_usable(organization_id)
  );

CREATE POLICY "Staff can update trip bookings of their org" ON public.trip_bookings
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'staff'
    )
    AND public.org_license_usable(organization_id)
  )
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'staff'
    )
    AND public.org_license_usable(organization_id)
  );
