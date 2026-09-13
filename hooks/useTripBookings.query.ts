import { TripBookingService } from "@/services/trip-bookings.service";
import type {
  ManualBookingFormState,
  TripBookingWithCustomer,
} from "@/types/trips";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { tripKeys } from "./useTrips.query";

export const tripBookingKeys = {
  all: ["trip-bookings"] as const,
  byTrip: (tripId: string) => [...tripBookingKeys.all, tripId] as const,
};

export function useTripBookingsQuery(tripId: string | null) {
  const query = useQuery({
    queryKey: tripBookingKeys.byTrip(tripId ?? ""),
    queryFn: async (): Promise<TripBookingWithCustomer[]> => {
      const result = await TripBookingService.getByTrip(tripId!);
      if (!result.success) {
        throw new Error(result.error || "Error al cargar las reservas");
      }
      return result.bookings ?? [];
    },
    enabled: !!tripId,
    staleTime: 1000 * 15,
  });

  return {
    bookings: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}

/** Bookings change the trip occupancy, so both key sets have to refresh. */
function useInvalidateBookings() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: tripBookingKeys.all });
    queryClient.invalidateQueries({ queryKey: tripKeys.all });
  };
}

/** Money axis. Does not approve anything. */
export function useSetAmountPaid() {
  const invalidate = useInvalidateBookings();

  return useMutation({
    mutationFn: async ({
      bookingId,
      amountPaid,
      method,
      extra,
    }: {
      bookingId: string;
      amountPaid: number;
      method?: string;
      extra?: { description: string; amount: number };
    }) => {
      const result = await TripBookingService.setAmountPaid(
        bookingId,
        amountPaid,
        method,
        extra
      );
      if (!result.success) {
        throw new Error(result.error || "Error al actualizar el cobro");
      }
    },
    onSuccess: invalidate,
  });
}

/** Seat axis. Does not touch the deposit. */
export function useSetBookingStatus() {
  const invalidate = useInvalidateBookings();

  return useMutation({
    mutationFn: async ({
      bookingId,
      status,
      reason,
    }: {
      bookingId: string;
      status: "confirmed" | "cancelled" | "completed" | "no_show";
      reason?: string;
    }) => {
      const result = await TripBookingService.setStatus(
        bookingId,
        status,
        reason
      );
      if (!result.success) {
        throw new Error(result.error || "Error al actualizar la reserva");
      }
    },
    onSuccess: invalidate,
  });
}

export function useUpdatePassengerNames() {
  const invalidate = useInvalidateBookings();

  return useMutation({
    mutationFn: async ({
      bookingId,
      names,
    }: {
      bookingId: string;
      names: string[];
    }) => {
      const result = await TripBookingService.updatePassengerNames(
        bookingId,
        names
      );
      if (!result.success) {
        throw new Error(result.error || "Error al guardar los nombres");
      }
    },
    onSuccess: invalidate,
  });
}

export function useCreateManualBooking() {
  const invalidate = useInvalidateBookings();

  return useMutation({
    mutationFn: async (params: {
      organizationId: string;
      tripId: string;
      form: ManualBookingFormState;
      pricePerSeat: number;
      depositPerSeat: number;
      requiresApproval: boolean;
    }) => {
      const result = await TripBookingService.createManual(params);
      if (!result.success) {
        throw new Error(result.error || "Error al cargar la reserva");
      }
    },
    onSuccess: invalidate,
  });
}
