import { PublicBookingService } from "@/services/public-booking.service";
import type { PublicBookingRequest } from "@/types/public-booking";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const publicBookingKeys = {
  all: ["public-booking"] as const,
  info: (slug: string) => [...publicBookingKeys.all, "info", slug] as const,
  slots: (slug: string, serviceId: string, staffId: string | null, date: string) =>
    [...publicBookingKeys.all, "slots", slug, serviceId, staffId ?? "any", date] as const,
};

/** Public data of the booking page (business, services, staff). */
export function usePublicBookingInfo(slug: string) {
  return useQuery({
    queryKey: publicBookingKeys.info(slug),
    queryFn: () => PublicBookingService.getInfo(slug),
    enabled: !!slug,
    staleTime: 1000 * 60,
    retry: 1,
  });
}

/** Free times for a service/day; always refetched, availability changes fast. */
export function usePublicSlots(params: {
  slug: string;
  serviceId: string | null;
  staffId: string | null;
  date: string | null;
}) {
  const { slug, serviceId, staffId, date } = params;
  return useQuery({
    queryKey: publicBookingKeys.slots(slug, serviceId ?? "", staffId, date ?? ""),
    queryFn: () =>
      PublicBookingService.getSlots({
        slug,
        serviceId: serviceId as string,
        staffId,
        date: date as string,
      }),
    enabled: !!slug && !!serviceId && !!date,
    staleTime: 0,
  });
}

export function useCreatePublicBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: PublicBookingRequest) => PublicBookingService.book(request),
    onSettled: () => {
      // Whatever happened, the free times shown are stale now
      queryClient.invalidateQueries({ queryKey: [...publicBookingKeys.all, "slots"] });
    },
  });
}
