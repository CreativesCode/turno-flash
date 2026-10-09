-- P3-18: the "manage" policies on customers and appointments are FOR ALL, so
-- an employee could delete rows through the API even though the app never
-- deletes them (customers are deactivated, appointments cancelled). Deleting
-- is now reserved to owners and admins. RESTRICTIVE: it narrows the existing
-- policies, which still require the row to belong to the user's organization.
CREATE POLICY "Only owners and admins delete customers" ON public.customers
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = ANY (ARRAY['admin'::user_role, 'owner'::user_role])
    )
  );

CREATE POLICY "Only owners and admins delete appointments" ON public.appointments
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.user_id = auth.uid()
        AND up.role = ANY (ARRAY['admin'::user_role, 'owner'::user_role])
    )
  );
