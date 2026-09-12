import { BookingSetupService } from "@/services/booking-setup.service";
import { useQuery } from "@tanstack/react-query";

export const bookingSetupKeys = {
  all: ["booking-setup"] as const,
  basics: (organizationId: string) =>
    [...bookingSetupKeys.all, "basics", organizationId] as const,
  readiness: (organizationId: string) =>
    [...bookingSetupKeys.all, "readiness", organizationId] as const,
};

/** Slug (for the public link) and timezone of an organization. */
export function useOrganizationBasics(organizationId: string) {
  return useQuery({
    queryKey: bookingSetupKeys.basics(organizationId),
    queryFn: async () => {
      const result = await BookingSetupService.getOrganizationBasics(organizationId);
      if (!result.success || !result.basics) {
        throw new Error(result.error || "No se pudo cargar el negocio");
      }
      return result.basics;
    },
    enabled: !!organizationId,
    staleTime: 1000 * 60 * 5,
  });
}

/** Active staff members and why each one would not appear online. */
export function useBookingReadiness(organizationId: string) {
  return useQuery({
    queryKey: bookingSetupKeys.readiness(organizationId),
    queryFn: async () => {
      const result = await BookingSetupService.getReadiness(organizationId);
      if (!result.success) {
        throw new Error(result.error || "No se pudo revisar el equipo");
      }
      return result.staff ?? [];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 30,
  });
}
