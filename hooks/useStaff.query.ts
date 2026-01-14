import { useAuth } from "@/contexts/auth-context";
import { staffFormSchema, staffUpdateSchema } from "@/schemas";
import { StaffService } from "@/services/staff.service";
import { StaffMember, StaffMemberFormData } from "@/types/appointments";
import {
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { ZodError } from "zod";

/**
 * Filters for staff query
 */
export interface StaffFilters {
  isActive?: boolean;
  isBookable?: boolean;
  acceptsOnlineBookings?: boolean;
}

/**
 * Query Keys for staff
 */
export const staffKeys = {
  all: ["staff"] as const,
  lists: () => [...staffKeys.all, "list"] as const,
  list: (orgId: string, filters?: StaffFilters) =>
    [...staffKeys.lists(), { orgId, ...(filters || {}) }] as const,
  details: () => [...staffKeys.all, "detail"] as const,
  detail: (orgId: string, staffId: string) =>
    [...staffKeys.details(), { orgId, staffId }] as const,
};

/**
 * Custom hook for querying staff with React Query
 * Provides automatic caching, refetching, and state management
 */
export function useStaff(
  filters?: StaffFilters,
  options?: Omit<UseQueryOptions<StaffMember[], Error>, "queryKey" | "queryFn">
) {
  const { profile } = useAuth();

  const query = useQuery({
    queryKey: staffKeys.list(profile?.organization_id || "", filters),
    queryFn: async () => {
      if (!profile?.organization_id) {
        return [];
      }

      const result = await StaffService.getAll(profile.organization_id, {
        isActive: filters?.isActive,
        isBookable: filters?.isBookable,
        acceptsOnlineBookings: filters?.acceptsOnlineBookings,
      });

      if (!result.success) {
        throw new Error(result.error || "Error al cargar el personal");
      }

      return result.staff || [];
    },
    enabled: !!profile?.organization_id,
    staleTime: 1000 * 60, // 1 minuto
    ...options,
  });

  return {
    staff: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  };
}

/**
 * Hook for creating staff members with Zod validation and automatic cache invalidation
 */
export function useCreateStaffMember() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: StaffMemberFormData) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      // Validate data with Zod schema
      try {
        const validatedData = staffFormSchema.parse(data);

        const result = await StaffService.create(
          validatedData,
          profile.organization_id
        );

        if (!result.success) {
          throw new Error(
            result.error || "Error al crear el miembro del personal"
          );
        }

        return result.staff;
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
      // Invalidate and refetch staff queries
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

/**
 * Hook for updating staff members with Zod validation and OPTIMISTIC UPDATES
 */
export function useUpdateStaffMember() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      staffId,
      data,
    }: {
      staffId: string;
      data: Partial<StaffMemberFormData>;
    }) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      // Validate data with Zod schema (partial update)
      try {
        const validatedData = staffUpdateSchema.parse(data);

        const result = await StaffService.update(
          staffId,
          validatedData,
          profile.organization_id
        );

        if (!result.success) {
          throw new Error(
            result.error || "Error al actualizar el miembro del personal"
          );
        }

        return result.staff;
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
    // OPTIMISTIC UPDATE: Update staff member immediately
    onMutate: async ({ staffId, data }) => {
      if (!profile?.organization_id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: staffKeys.lists() });
      await queryClient.cancelQueries({
        queryKey: staffKeys.detail(profile.organization_id, staffId),
      });

      // Snapshot previous values
      const previousStaffLists = queryClient.getQueriesData({
        queryKey: staffKeys.lists(),
      });
      const previousStaffDetail = queryClient.getQueryData(
        staffKeys.detail(profile.organization_id, staffId)
      );

      // Optimistically update all staff list queries
      queryClient.setQueriesData(
        { queryKey: staffKeys.lists() },
        (old: StaffMember[] | undefined) => {
          if (!old) return old;
          return old.map((staff) =>
            staff.id === staffId ? { ...staff, ...data } : staff
          );
        }
      );

      // Optimistically update detail query
      queryClient.setQueryData(
        staffKeys.detail(profile.organization_id, staffId),
        (old: StaffMember | undefined) => {
          if (!old) return old;
          return { ...old, ...data };
        }
      );

      return { previousStaffLists, previousStaffDetail };
    },
    // ROLLBACK on error
    onError: (error, variables, context) => {
      if (!profile?.organization_id) return;

      if (context?.previousStaffLists) {
        context.previousStaffLists.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      if (context?.previousStaffDetail) {
        queryClient.setQueryData(
          staffKeys.detail(profile.organization_id, variables.staffId),
          context.previousStaffDetail
        );
      }
    },
    // Refetch to ensure consistency
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      queryClient.invalidateQueries({
        queryKey: staffKeys.detail(
          profile?.organization_id || "",
          variables.staffId
        ),
      });
    },
  });
}

/**
 * Hook for deactivating staff members (soft delete)
 */
export function useDeactivateStaffMember() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (staffId: string) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await StaffService.deactivate(
        staffId,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(
          result.error || "Error al desactivar el miembro del personal"
        );
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate staff queries
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

/**
 * Hook for reactivating staff members
 */
export function useReactivateStaffMember() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (staffId: string) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await StaffService.reactivate(
        staffId,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(
          result.error || "Error al reactivar el miembro del personal"
        );
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate staff queries
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

/**
 * Hook for getting a single staff member by ID
 */
export function useStaffById(staffId: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: staffKeys.detail(profile?.organization_id || "", staffId),
    queryFn: async () => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await StaffService.getById(
        staffId,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(
          result.error || "Error al cargar el miembro del personal"
        );
      }

      return result.staff;
    },
    enabled: !!profile?.organization_id && !!staffId,
    staleTime: 1000 * 60 * 5, // 5 minutos - individual records change less frequently
  });
}

/**
 * Hook for reordering staff members
 */
export function useReorderStaff() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (staffIds: string[]) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await StaffService.reorder(
        staffIds,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(result.error || "Error al reordenar el personal");
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate staff queries to update order
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}
