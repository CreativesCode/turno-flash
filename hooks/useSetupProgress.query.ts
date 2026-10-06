import { useAuth } from "@/contexts/auth-context";
import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";
import { OnboardingService } from "@/services/onboarding.service";
import { useQuery } from "@tanstack/react-query";

export const setupProgressKeys = {
  org: (orgId: string) => ["setup-progress", orgId] as const,
};

/**
 * Progress of the first steps guide. Checked every time Inicio opens: the
 * owner comes back from creating a service and expects the tick.
 */
export function useSetupProgress(enabled: boolean) {
  const { profile } = useAuth();
  const { modules, ready } = useOrganizationModules();
  const orgId = profile?.organization_id ?? "";

  return useQuery({
    queryKey: setupProgressKeys.org(orgId),
    queryFn: () =>
      OnboardingService.getProgress(orgId, {
        appointments: modules.appointments,
        trips: modules.trips,
      }),
    enabled: enabled && !!orgId && ready,
    staleTime: 0,
  });
}
