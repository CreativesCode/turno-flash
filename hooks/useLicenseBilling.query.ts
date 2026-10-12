import type { BillingPeriod } from "@/config/license-pricing";
import { licenseKeys } from "@/hooks/useLicense";
import {
  type LicenseBillingPatch,
  LicenseService,
} from "@/services/license.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const licenseBillingKeys = {
  all: ["license-billing"] as const,
  payments: (orgId: string) =>
    [...licenseBillingKeys.all, "payments", orgId] as const,
  quote: (orgId: string, period: BillingPeriod) =>
    [...licenseBillingKeys.all, "quote", orgId, period] as const,
  referred: (orgId: string) =>
    [...licenseBillingKeys.all, "referred", orgId] as const,
  organizations: () => [...licenseBillingKeys.all, "organizations"] as const,
};

export function useLicensePayments(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: licenseBillingKeys.payments(organizationId),
    queryFn: () => LicenseService.listPayments(organizationId),
    enabled: enabled && !!organizationId,
  });
}

/**
 * What a payment would charge and cover. Always fresh: the dates depend on
 * today and on the plan, and the admin confirms exactly what is shown.
 */
export function useLicenseQuote(
  organizationId: string,
  period: BillingPeriod,
  enabled: boolean
) {
  return useQuery({
    queryKey: licenseBillingKeys.quote(organizationId, period),
    queryFn: () => LicenseService.quote(organizationId, period),
    enabled: enabled && !!organizationId,
    staleTime: 0,
    gcTime: 0,
  });
}

export function useReferredOrganizations(organizationId: string, enabled = true) {
  return useQuery({
    queryKey: licenseBillingKeys.referred(organizationId),
    queryFn: () => LicenseService.listReferred(organizationId),
    enabled: enabled && !!organizationId,
  });
}

export function useOrganizationOptions(enabled: boolean) {
  return useQuery({
    queryKey: licenseBillingKeys.organizations(),
    queryFn: () => LicenseService.listOrganizationOptions(),
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}

export function useRecordLicensePayment(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ period, note }: { period: BillingPeriod; note: string }) =>
      LicenseService.recordPayment(organizationId, period, note),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: licenseBillingKeys.all });
      // The business (and a referrer) may be open in another tab of the admin
      void queryClient.invalidateQueries({ queryKey: ["license"] });
      void queryClient.invalidateQueries({
        queryKey: licenseKeys.org(organizationId),
      });
    },
  });
}

export function useUpdateLicenseBilling(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: LicenseBillingPatch) =>
      LicenseService.updateBilling(organizationId, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: licenseBillingKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["organization-modules"] });
    },
  });
}
