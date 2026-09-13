import { PublicTripsService } from "@/services/public-trips.service";
import type { PublicTripBookingRequest } from "@/types/public-trips";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const publicTripsKeys = {
  all: ["public-trips"] as const,
  info: (slug: string) => [...publicTripsKeys.all, "info", slug] as const,
};

/**
 * Departures of a business, with their free seats.
 *
 * Realtime is not an option here: it enforces RLS and `anon` has no policies
 * on these tables — nor should it. So the page revalidates instead, which
 * gives the customer the same thing (seats that go down while they decide)
 * without opening anything: it refetches every 30s while the tab is visible,
 * on focus, and on demand before confirming.
 */
export function usePublicTripsInfo(slug: string) {
  return useQuery({
    queryKey: publicTripsKeys.info(slug),
    queryFn: () => PublicTripsService.getInfo(slug),
    enabled: !!slug,
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

export function useCreatePublicTripBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: PublicTripBookingRequest) =>
      PublicTripsService.book(request),
    onSettled: () => {
      // Booked or rejected, the seats shown on the page are stale now.
      queryClient.invalidateQueries({ queryKey: publicTripsKeys.all });
    },
  });
}
