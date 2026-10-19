import { useAuth } from "@/contexts/auth-context";
import { AnalyticsService } from "@/services/analytics.service";
import { useQuery } from "@tanstack/react-query";

/**
 * Query Keys for analytics
 */
export const analyticsKeys = {
  all: ["analytics"] as const,
  organization: (orgId: string, startDate: string, endDate: string) =>
    [...analyticsKeys.all, "organization", { orgId, startDate, endDate }] as const,
  platform: () => [...analyticsKeys.all, "platform"] as const,
  orgActivity: (orgId: string, startDate?: string, endDate?: string) =>
    [...analyticsKeys.all, "org-activity", { orgId, startDate, endDate }] as const,
  orgsActivity: () => [...analyticsKeys.all, "orgs-activity"] as const,
};

/**
 * Analítica de la organización para /dashboard/reports.
 * owner: su organización. admin: puede pasar organizationId explícito.
 */
export function useOrganizationAnalytics(
  startDate: string,
  endDate: string,
  organizationId?: string
) {
  const { profile } = useAuth();
  const effectiveOrgId = organizationId || profile?.organization_id || "";
  const allowedRole = profile?.role === "owner" || profile?.role === "admin";

  return useQuery({
    queryKey: analyticsKeys.organization(effectiveOrgId, startDate, endDate),
    queryFn: async () => {
      const result = await AnalyticsService.getOrganizationAnalytics(
        startDate,
        endDate,
        organizationId
      );
      if (!result.success || !result.data) {
        throw new Error(result.error || "Error al cargar los reportes");
      }
      return result.data;
    },
    enabled: !!effectiveOrgId && allowedRole,
    staleTime: 1000 * 60 * 5, // 5 minutos: la analítica no necesita ser en vivo
  });
}

/**
 * Estadísticas globales de la plataforma para /dashboard/platform (solo admin).
 */
export function usePlatformStats() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: analyticsKeys.platform(),
    queryFn: async () => {
      const result = await AnalyticsService.getPlatformStats();
      if (!result.success || !result.data) {
        throw new Error(
          result.error || "Error al cargar las estadísticas de la plataforma"
        );
      }
      return result.data;
    },
    enabled: profile?.role === "admin",
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Activity of one business for /dashboard/organizations/details (admin only).
 * Without dates it covers all time.
 */
export function useOrganizationActivity(
  organizationId: string,
  startDate?: string,
  endDate?: string
) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: analyticsKeys.orgActivity(organizationId, startDate, endDate),
    queryFn: async () => {
      const result = await AnalyticsService.getOrganizationActivity(
        organizationId,
        startDate,
        endDate
      );
      if (!result.success || !result.data) {
        throw new Error(result.error || "Error al cargar la actividad");
      }
      return result.data;
    },
    enabled: !!organizationId && profile?.role === "admin",
    staleTime: 1000 * 60 * 5,
  });
}

/** One activity line per business for /dashboard/organizations (admin only). */
export function useOrganizationsActivity() {
  const { profile } = useAuth();

  return useQuery({
    queryKey: analyticsKeys.orgsActivity(),
    queryFn: async () => {
      const result = await AnalyticsService.getOrganizationsActivity();
      if (!result.success || !result.data) {
        throw new Error(result.error || "Error al cargar la actividad");
      }
      return result.data;
    },
    enabled: profile?.role === "admin",
    staleTime: 1000 * 60 * 5,
  });
}
