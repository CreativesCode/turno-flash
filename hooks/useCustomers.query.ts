import { useAuth } from "@/contexts/auth-context";
import { CustomerService } from "@/services/customers.service";
import { Customer, CustomerFormData } from "@/types/appointments";
import {
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

/**
 * Filters for customers query
 */
export interface CustomerFilters {
  isActive?: boolean;
  search?: string;
}

/**
 * Query Keys for customers
 */
export const customerKeys = {
  all: ["customers"] as const,
  lists: () => [...customerKeys.all, "list"] as const,
  list: (orgId: string, filters?: CustomerFilters) =>
    [...customerKeys.lists(), { orgId, ...(filters || {}) }] as const,
  details: () => [...customerKeys.all, "detail"] as const,
  detail: (orgId: string, customerId: string) =>
    [...customerKeys.details(), { orgId, customerId }] as const,
  statistics: (orgId: string, customerId: string) =>
    [...customerKeys.all, "statistics", { orgId, customerId }] as const,
};

/**
 * Custom hook for querying customers with React Query
 * Provides automatic caching, refetching, and state management
 */
export function useCustomers(
  filters?: CustomerFilters,
  options?: Omit<UseQueryOptions<Customer[], Error>, "queryKey" | "queryFn">
) {
  const { profile } = useAuth();

  const query = useQuery({
    queryKey: customerKeys.list(profile?.organization_id || "", filters || {}),
    queryFn: async () => {
      if (!profile?.organization_id) {
        return [];
      }

      const result = await CustomerService.getAll(profile.organization_id, {
        isActive: filters?.isActive,
        search: filters?.search,
      });

      if (!result.success) {
        throw new Error(result.error || "Error al cargar los clientes");
      }

      return result.customers || [];
    },
    enabled: !!profile?.organization_id,
    staleTime: 1000 * 60, // 1 minuto
    ...options,
  });

  return {
    customers: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  };
}

/**
 * Hook for creating customers with automatic cache invalidation
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!profile?.organization_id || !profile?.user_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await CustomerService.create(
        data,
        profile.organization_id,
        profile.user_id
      );

      if (!result.success) {
        throw new Error(result.error || "Error al crear el cliente");
      }

      return result.customer;
    },
    onSuccess: () => {
      // Invalidate and refetch customers queries
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

/**
 * Hook for updating customers
 */
export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      customerId,
      data,
    }: {
      customerId: string;
      data: Partial<CustomerFormData>;
    }) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await CustomerService.update(
        customerId,
        data,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(result.error || "Error al actualizar el cliente");
      }

      return result.customer;
    },
    onSuccess: (_, variables) => {
      // Invalidate customers queries
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      // Invalidate specific customer detail
      queryClient.invalidateQueries({
        queryKey: customerKeys.detail(
          profile?.organization_id || "",
          variables.customerId
        ),
      });
    },
  });
}

/**
 * Hook for deactivating customers (soft delete)
 */
export function useDeactivateCustomer() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (customerId: string) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await CustomerService.deactivate(
        customerId,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(result.error || "Error al desactivar el cliente");
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate customers queries
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

/**
 * Hook for reactivating customers
 */
export function useReactivateCustomer() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (customerId: string) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await CustomerService.reactivate(
        customerId,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(result.error || "Error al reactivar el cliente");
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate customers queries
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

/**
 * Hook for getting a single customer by ID
 */
export function useCustomerById(customerId: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: customerKeys.detail(profile?.organization_id || "", customerId),
    queryFn: async () => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await CustomerService.getById(
        customerId,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(result.error || "Error al cargar el cliente");
      }

      return result.customer;
    },
    enabled: !!profile?.organization_id && !!customerId,
    staleTime: 1000 * 60 * 5, // 5 minutos - individual records change less frequently
  });
}

/**
 * Hook for getting customer statistics
 */
export function useCustomerStatistics(customerId: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: customerKeys.statistics(
      profile?.organization_id || "",
      customerId
    ),
    queryFn: async () => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await CustomerService.getStatistics(
        customerId,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(result.error || "Error al cargar estadísticas");
      }

      return result.stats;
    },
    enabled: !!profile?.organization_id && !!customerId,
    staleTime: 1000 * 60 * 5, // 5 minutos - statistics change less frequently
  });
}
