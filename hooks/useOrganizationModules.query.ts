import { type LicensePlan, isLicensePlan } from "@/config/license-pricing";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/utils/supabase/client";
import { useQuery } from "@tanstack/react-query";

/**
 * Modules enabled for the current organization (PRP-002, migration 033).
 *
 * A business can run Turnos, Viajes or both. The choice is made at signup and
 * only a platform admin can change it afterwards, so this is read-only here.
 * The timezone travels along because creating a departure needs it.
 */
export interface OrganizationModules {
  appointments: boolean;
  trips: boolean;
  timezone: string;
  /** Shown on printed sheets so the driver knows whose list it is. */
  name: string;
  /** ISO code the business charges in; every amount is formatted with it. */
  currency: string;
  /** Used to build the public booking links. */
  slug: string;
  /** License plan; it sets how many active professionals fit. */
  plan: LicensePlan;
}

export const organizationModuleKeys = {
  all: ["organization-modules"] as const,
  org: (orgId: string) => [...organizationModuleKeys.all, orgId] as const,
};

/** An organization with no data yet behaves like the default: appointments only. */
const FALLBACK: OrganizationModules = {
  appointments: true,
  trips: false,
  timezone: "UTC",
  name: "",
  currency: "USD",
  slug: "",
  plan: "personal",
};

/** `organizationId` lets a platform admin read another business; defaults to the user's own. */
export function useOrganizationModules(organizationId?: string) {
  const { profile } = useAuth();
  const orgId = organizationId || profile?.organization_id || "";

  const query = useQuery({
    queryKey: organizationModuleKeys.org(orgId),
    queryFn: async (): Promise<OrganizationModules> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("organizations")
        .select(
          "appointments_module_enabled, trips_module_enabled, timezone, name, currency, slug, license_plan"
        )
        .eq("id", orgId)
        .single();
      if (error) throw error;
      return {
        appointments: data.appointments_module_enabled ?? true,
        trips: data.trips_module_enabled ?? false,
        timezone: data.timezone ?? "UTC",
        name: data.name ?? "",
        currency: data.currency || "USD",
        slug: data.slug ?? "",
        plan: isLicensePlan(data.license_plan) ? data.license_plan : "personal",
      };
    },
    enabled: !!orgId,
    staleTime: 1000 * 60 * 5,
  });

  return {
    modules: query.data ?? FALLBACK,
    loading: query.isLoading,
    /** True once the real data arrived; until then `modules` is only the fallback. */
    ready: query.isSuccess,
  };
}
