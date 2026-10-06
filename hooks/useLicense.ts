// Hook personalizado para gestión de licencias

import { useQuery } from "@tanstack/react-query";
import { LicenseStatusResult } from "@/types/organization";
import {
  getMyOrganizationLicenseStatus,
  canUseApplication,
  shouldShowLicenseNotification,
  getLicenseAlertType,
  getLicenseMessageTitle,
  formatLicenseMessage,
} from "@/utils/license";
import { useAuth } from "@/contexts/auth-context";
import { Logger } from "@/utils/logger";

export const licenseKeys = {
  org: (orgId: string) => ["license", orgId] as const,
};

/**
 * License status of the user's organization, shared by every caller (the
 * gate, Inicio, Suscripción) instead of one request each (P2-04). Refetched
 * when the owner returns to the app: a license can expire mid-session (P1-13).
 */
export function useLicense() {
  const { profile } = useAuth();
  // Admins without organization have nothing to check
  const needsCheck = !!profile?.organization_id || profile?.role === "admin";

  const query = useQuery({
    queryKey: licenseKeys.org(profile?.organization_id ?? "none"),
    queryFn: async () => {
      try {
        return await getMyOrganizationLicenseStatus();
      } catch (err) {
        void Logger.error("Error loading license status", err, {
          hook: "useLicense",
        });
        throw err;
      }
    },
    enabled: !!profile && needsCheck,
    staleTime: 1000 * 60 * 5,
    // Even within staleTime: the check on return is the point (P1-13)
    refetchOnWindowFocus: "always",
  });

  const licenseStatus: LicenseStatusResult | null = query.data ?? null;
  const loading = !!profile && needsCheck ? query.isLoading : false;
  const error = query.error
    ? query.error instanceof Error
      ? query.error.message
      : "Error al cargar estado de licencia"
    : null;

  return {
    licenseStatus,
    loading,
    error,
    // Funciones de utilidad
    canUse: canUseApplication(licenseStatus),
    shouldShowNotification: shouldShowLicenseNotification(licenseStatus),
    alertType: getLicenseAlertType(licenseStatus),
    title: getLicenseMessageTitle(licenseStatus),
    message: formatLicenseMessage(licenseStatus),
    // Información adicional
    isBlocked: licenseStatus ? !canUseApplication(licenseStatus) : false,
    isInGracePeriod: licenseStatus?.status === "grace_period",
    isExpired: licenseStatus?.status === "expired",
    isActive: licenseStatus?.status === "active",
    hasNoLicense: licenseStatus?.status === "no_license",
    daysRemaining: licenseStatus?.days_remaining || null,
  };
}
