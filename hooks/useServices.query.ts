import { useAuth } from "@/contexts/auth-context";
import { ServiceService } from "@/services/services.service";
import { Service, ServiceFormData } from "@/types/appointments";
import {
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

/**
 * Filters for services query
 */
export interface ServiceFilters {
  isActive?: boolean;
  categoryId?: string;
  availableForOnlineBooking?: boolean;
}

/**
 * Query Keys for services
 */
export const serviceKeys = {
  all: ["services"] as const,
  lists: () => [...serviceKeys.all, "list"] as const,
  list: (orgId: string, filters?: ServiceFilters) =>
    [...serviceKeys.lists(), { orgId, ...(filters || {}) }] as const,
  details: () => [...serviceKeys.all, "detail"] as const,
  detail: (orgId: string, serviceId: string) =>
    [...serviceKeys.details(), { orgId, serviceId }] as const,
};

/**
 * Custom hook for querying services with React Query
 * Provides automatic caching, refetching, and state management
 */
export function useServices(
  filters?: ServiceFilters,
  options?: Omit<UseQueryOptions<Service[], Error>, "queryKey" | "queryFn">
) {
  const { profile } = useAuth();

  const query = useQuery({
    queryKey: serviceKeys.list(profile?.organization_id || "", filters),
    queryFn: async () => {
      if (!profile?.organization_id) {
        return [];
      }

      const result = await ServiceService.getAll(profile.organization_id, {
        isActive: filters?.isActive,
        categoryId: filters?.categoryId,
        availableForOnlineBooking: filters?.availableForOnlineBooking,
      });

      if (!result.success) {
        throw new Error(result.error || "Error al cargar los servicios");
      }

      return result.services || [];
    },
    enabled: !!profile?.organization_id,
    staleTime: 1000 * 60, // 1 minuto
    ...options,
  });

  return {
    services: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  };
}

/**
 * Hook for creating services with automatic cache invalidation
 */
export function useCreateService() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: ServiceFormData) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await ServiceService.create(data, profile.organization_id);

      if (!result.success) {
        throw new Error(result.error || "Error al crear el servicio");
      }

      return result.service;
    },
    onSuccess: () => {
      // Invalidate and refetch services queries
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}

/**
 * Hook for updating services
 */
export function useUpdateService() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      serviceId,
      data,
    }: {
      serviceId: string;
      data: Partial<ServiceFormData>;
    }) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await ServiceService.update(
        serviceId,
        data,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(result.error || "Error al actualizar el servicio");
      }

      return result.service;
    },
    onSuccess: (_, variables) => {
      // Invalidate services queries
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
      // Invalidate specific service detail
      queryClient.invalidateQueries({
        queryKey: serviceKeys.detail(
          profile?.organization_id || "",
          variables.serviceId
        ),
      });
    },
  });
}

/**
 * Hook for deactivating services (soft delete)
 */
export function useDeactivateService() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await ServiceService.deactivate(
        serviceId,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(result.error || "Error al desactivar el servicio");
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate services queries
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}

/**
 * Hook for reactivating services
 */
export function useReactivateService() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (serviceId: string) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await ServiceService.reactivate(
        serviceId,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(result.error || "Error al reactivar el servicio");
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate services queries
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}

/**
 * Hook for getting a single service by ID
 */
export function useServiceById(serviceId: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: serviceKeys.detail(profile?.organization_id || "", serviceId),
    queryFn: async () => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await ServiceService.getById(
        serviceId,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(result.error || "Error al cargar el servicio");
      }

      return result.service;
    },
    enabled: !!profile?.organization_id && !!serviceId,
    staleTime: 1000 * 60 * 5, // 5 minutos - individual records change less frequently
  });
}

/**
 * Hook for reordering services
 */
export function useReorderServices() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (serviceIds: string[]) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await ServiceService.reorder(
        serviceIds,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(result.error || "Error al reordenar los servicios");
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate services queries to update order
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: serviceKeys.all });
    },
  });
}
