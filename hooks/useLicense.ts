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
import {
  type LicensePhase,
  type LicensePlan,
  isLicensePlan,
} from "@/config/license-pricing";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";

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

/** Plan and billing data of the user's business, for Suscripción and the gate. */
export interface OrganizationLicense {
  plan: LicensePlan;
  phase: LicensePhase;
  founder: boolean;
  /** `YYYY-MM-DD`; null until the first payment of a founder business. */
  founderPriceUntil: string | null;
  licenseEndDate: string | null;
  secondModule: boolean;
}

export function useOrganizationLicense() {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? "";

  return useQuery({
    // Under the license key: refreshed and persisted together with the status
    queryKey: [...licenseKeys.org(orgId), "plan"] as const,
    queryFn: async (): Promise<OrganizationLicense> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("organizations")
        .select(
          "license_plan, license_phase, license_founder, founder_price_until, license_end_date, appointments_module_enabled, trips_module_enabled"
        )
        .eq("id", orgId)
        .single();
      if (error) throw error;
      return {
        plan: isLicensePlan(data.license_plan) ? data.license_plan : "personal",
        phase: data.license_phase as LicensePhase,
        founder: data.license_founder,
        founderPriceUntil: data.founder_price_until,
        licenseEndDate: data.license_end_date,
        secondModule:
          !!data.appointments_module_enabled && !!data.trips_module_enabled,
      };
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });
}
