import { useAuth } from "@/contexts/auth-context";
import { TripService } from "@/services/trips.service";
import type {
  PickupPointFormState,
  Trip,
  TripFormData,
  TripWithOccupancy,
} from "@/types/trips";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOrganizationModules } from "./useOrganizationModules.query";

export interface TripFilters {
  /** Past departures are hidden by default: the list is a work queue. */
  includePast?: boolean;
}

export const tripKeys = {
  all: ["trips"] as const,
  lists: () => [...tripKeys.all, "list"] as const,
  list: (orgId: string, filters?: TripFilters) =>
    [...tripKeys.lists(), { orgId, ...(filters || {}) }] as const,
};

export function useTripsQuery(filters?: TripFilters) {
  const { profile } = useAuth();
  const orgId = profile?.organization_id ?? "";

  const query = useQuery({
    queryKey: tripKeys.list(orgId, filters),
    queryFn: async (): Promise<TripWithOccupancy[]> => {
      const result = await TripService.getAll(orgId, filters);
      if (!result.success) {
        throw new Error(result.error || "Error al cargar los viajes");
      }
      return result.trips ?? [];
    },
    enabled: !!orgId,
    staleTime: 1000 * 30,
  });

  return {
    trips: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
  };
}

/** Realtime already invalidates these keys; this keeps the list honest anyway. */
function useInvalidateTrips() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: tripKeys.all });
  };
}

export function useCreateTrip() {
  const { profile } = useAuth();
  const { modules } = useOrganizationModules();
  const invalidate = useInvalidateTrips();

  return useMutation({
    mutationFn: async ({
      data,
      pickupPoints,
    }: {
      data: TripFormData;
      pickupPoints: PickupPointFormState[];
    }) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }
      const result = await TripService.create(
        data,
        profile.organization_id,
        modules.timezone,
        pickupPoints
      );
      if (!result.success) {
        throw new Error(result.error || "Error al crear el viaje");
      }
      return result.trip;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateTrip() {
  const { profile } = useAuth();
  const invalidate = useInvalidateTrips();

  return useMutation({
    mutationFn: async ({
      tripId,
      data,
      pickupPoints,
    }: {
      tripId: string;
      data: TripFormData;
      pickupPoints: PickupPointFormState[];
    }) => {
      const result = await TripService.update(
        tripId,
        data,
        profile?.organization_id ?? undefined,
        pickupPoints
      );
      if (!result.success) {
        throw new Error(result.error || "Error al actualizar el viaje");
      }
      return result.trip;
    },
    onSuccess: invalidate,
  });
}

export function useSetTripPublished() {
  const invalidate = useInvalidateTrips();

  return useMutation({
    mutationFn: async ({
      tripId,
      isPublished,
    }: {
      tripId: string;
      isPublished: boolean;
    }) => {
      const result = await TripService.setPublished(tripId, isPublished);
      if (!result.success) {
        throw new Error(result.error || "Error al cambiar la publicación");
      }
    },
    onSuccess: invalidate,
  });
}

export function useCancelTrip() {
  const invalidate = useInvalidateTrips();

  return useMutation({
    mutationFn: async (tripId: string) => {
      const result = await TripService.cancel(tripId);
      if (!result.success) {
        throw new Error(result.error || "Error al cancelar el viaje");
      }
    },
    onSuccess: invalidate,
  });
}

export function useDuplicateTrip() {
  const invalidate = useInvalidateTrips();

  return useMutation({
    mutationFn: async ({
      trip,
      departureDate,
    }: {
      trip: Trip;
      departureDate: string;
    }) => {
      const result = await TripService.duplicate(trip, departureDate);
      if (!result.success) {
        throw new Error(result.error || "Error al duplicar el viaje");
      }
      return result.trip;
    },
    onSuccess: invalidate,
  });
}
