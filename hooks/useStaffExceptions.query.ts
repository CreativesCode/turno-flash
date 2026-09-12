import type { StaffExceptionInput } from "@/schemas/staff-exception.schema";
import { StaffExceptionService } from "@/services/staff-exceptions.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const staffExceptionKeys = {
  all: ["staff-exceptions"] as const,
  list: (organizationId: string, staffId: string | null) =>
    [...staffExceptionKeys.all, organizationId, staffId ?? "business"] as const,
};

/** Current and future days off; `staffId` null = business-wide closures. */
export function useStaffExceptions(organizationId: string, staffId: string | null) {
  return useQuery({
    queryKey: staffExceptionKeys.list(organizationId, staffId),
    queryFn: async () => {
      const result = await StaffExceptionService.list(organizationId, staffId);
      if (!result.success) {
        throw new Error(result.error || "No se pudieron cargar los días libres");
      }
      return result.exceptions ?? [];
    },
    enabled: !!organizationId,
    staleTime: 1000 * 30,
  });
}

export function useCreateStaffException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      organizationId: string;
      staffId: string | null;
      timezone: string;
      input: StaffExceptionInput;
    }) => {
      const result = await StaffExceptionService.create(params);
      if (!result.success) throw new Error(result.error || "No se pudo guardar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffExceptionKeys.all });
    },
  });
}

export function useDeleteStaffException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await StaffExceptionService.delete(id);
      if (!result.success) throw new Error(result.error || "No se pudo eliminar");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: staffExceptionKeys.all });
    },
  });
}
