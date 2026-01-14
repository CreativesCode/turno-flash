import { useAuth } from "@/contexts/auth-context";
import { customerFormSchema, customerUpdateSchema } from "@/schemas";
import { CustomerService } from "@/services/customers.service";
import { Customer, CustomerFormData } from "@/types/appointments";
import {
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ZodError } from "zod";

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
 * Hook for creating customers with Zod validation and automatic cache invalidation
 */
export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: CustomerFormData) => {
      if (!profile?.organization_id || !profile?.user_id) {
        throw new Error("No se encontró la información de la organización");
      }

      // Validate data with Zod schema
      try {
        const validatedData = customerFormSchema.parse(data);

        const result = await CustomerService.create(
          validatedData,
          profile.organization_id,
          profile.user_id
        );

        if (!result.success) {
          throw new Error(result.error || "Error al crear el cliente");
        }

        return result.customer;
      } catch (error) {
        if (error instanceof ZodError) {
          const firstError = error.issues[0];
          throw new Error(
            `Validación fallida: ${
              firstError.message
            } (campo: ${firstError.path.join(".")})`
          );
        }
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate and refetch customers queries
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
    },
  });
}

/**
 * Hook for updating customers with Zod validation and OPTIMISTIC UPDATES
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

      // Validate data with Zod schema (partial update)
      try {
        const validatedData = customerUpdateSchema.parse(data);

        const result = await CustomerService.update(
          customerId,
          validatedData,
          profile.organization_id
        );

        if (!result.success) {
          throw new Error(result.error || "Error al actualizar el cliente");
        }

        return result.customer;
      } catch (error) {
        if (error instanceof ZodError) {
          const firstError = error.issues[0];
          throw new Error(
            `Validación fallida: ${
              firstError.message
            } (campo: ${firstError.path.join(".")})`
          );
        }
        throw error;
      }
    },
    // OPTIMISTIC UPDATE: Update customer immediately
    onMutate: async ({ customerId, data }) => {
      if (!profile?.organization_id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: customerKeys.lists() });
      await queryClient.cancelQueries({
        queryKey: customerKeys.detail(profile.organization_id, customerId),
      });

      // Snapshot previous values
      const previousCustomerLists = queryClient.getQueriesData({
        queryKey: customerKeys.lists(),
      });
      const previousCustomerDetail = queryClient.getQueryData(
        customerKeys.detail(profile.organization_id, customerId)
      );

      // Optimistically update all customer list queries
      queryClient.setQueriesData(
        { queryKey: customerKeys.lists() },
        (old: Customer[] | undefined) => {
          if (!old) return old;
          return old.map((customer) =>
            customer.id === customerId ? { ...customer, ...data } : customer
          );
        }
      );

      // Optimistically update detail query
      queryClient.setQueryData(
        customerKeys.detail(profile.organization_id, customerId),
        (old: Customer | undefined) => {
          if (!old) return old;
          return { ...old, ...data };
        }
      );

      return { previousCustomerLists, previousCustomerDetail };
    },
    // ROLLBACK on error
    onError: (_error, variables, context) => {
      if (!profile?.organization_id) return;

      if (context?.previousCustomerLists) {
        context.previousCustomerLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousCustomerDetail) {
        queryClient.setQueryData(
          customerKeys.detail(profile.organization_id, variables.customerId),
          context.previousCustomerDetail
        );
      }
    },
    // Refetch to ensure consistency
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.lists() });
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
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
