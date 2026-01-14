import { useAuth } from "@/contexts/auth-context";
import { StaffService } from "@/services/staff.service";
import { StaffMember, StaffMemberFormData } from "@/types/appointments";
import {
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

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
 * Hook for creating staff members with automatic cache invalidation
 */
export function useCreateStaffMember() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: StaffMemberFormData) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await StaffService.create(data, profile.organization_id);

      if (!result.success) {
        throw new Error(
          result.error || "Error al crear el miembro del personal"
        );
      }

      return result.staff;
    },
    onSuccess: () => {
      // Invalidate and refetch staff queries
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
    },
  });
}

/**
 * Hook for updating staff members
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

      const result = await StaffService.update(
        staffId,
        data,
        profile.organization_id
      );

      if (!result.success) {
        throw new Error(
          result.error || "Error al actualizar el miembro del personal"
        );
      }

      return result.staff;
    },
    onSuccess: (_, variables) => {
      // Invalidate staff queries
      queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
      queryClient.invalidateQueries({ queryKey: staffKeys.all });
      // Invalidate specific staff detail
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
