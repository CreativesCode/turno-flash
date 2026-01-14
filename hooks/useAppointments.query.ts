import { useAuth } from "@/contexts/auth-context";
import {
  appointmentFormSchema,
  appointmentUpdateStatusSchema,
  checkAvailabilitySchema,
  sendReminderSchema,
} from "@/schemas";
import { AppointmentService } from "@/services/appointments.service";
import {
  AppointmentFormData,
  AppointmentStatus,
  AppointmentWithDetails,
} from "@/types/appointments";
import {
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { ZodError } from "zod";

/**
 * Filters for appointments query
 */
export interface AppointmentFilters {
  staffId?: string;
  serviceId?: string;
  customerId?: string;
  status?: AppointmentStatus[];
  startDate?: string;
  endDate?: string;
}

/**
 * Query Keys for appointments
 */
export const appointmentKeys = {
  all: ["appointments"] as const,
  lists: () => [...appointmentKeys.all, "list"] as const,
  list: (orgId: string, filters: AppointmentFilters) =>
    [...appointmentKeys.lists(), { orgId, ...filters }] as const,
  statistics: (orgId: string, startDate: string, endDate: string) =>
    [
      ...appointmentKeys.all,
      "statistics",
      { orgId, startDate, endDate },
    ] as const,
};

/**
 * Custom hook for querying appointments with React Query
 * Provides automatic caching, refetching, and state management
 */
export function useAppointments(
  filters?: AppointmentFilters,
  options?: Omit<
    UseQueryOptions<AppointmentWithDetails[], Error>,
    "queryKey" | "queryFn"
  >
) {
  const { profile } = useAuth();

  // Default to current month if no dates provided
  const today = new Date();
  const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const defaultEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const startDate = filters?.startDate || defaultStartDate;
  const endDate = filters?.endDate || defaultEndDate;

  // Serialize status array for stable query key (prevents refetch loops)
  const statusKey = useMemo(() => {
    if (!filters?.status || filters.status.length === 0) return "";
    return JSON.stringify([...filters.status].sort());
  }, [filters?.status?.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtersWithDates = useMemo(
    () => ({
      ...filters,
      startDate,
      endDate,
      // Use statusKey in memo dependencies but keep original status in filters
    }),
    [
      filters?.staffId,
      filters?.serviceId,
      filters?.customerId,
      startDate,
      endDate,
      statusKey, // Use serialized version for memo
    ]
  );

  const query = useQuery({
    queryKey: appointmentKeys.list(
      profile?.organization_id || "",
      filtersWithDates
    ),
    queryFn: async () => {
      if (!profile?.organization_id) {
        return [];
      }

      const result = await AppointmentService.getByDateRange(
        profile.organization_id,
        startDate,
        endDate,
        {
          staffId: filters?.staffId,
          serviceId: filters?.serviceId,
          customerId: filters?.customerId,
          status: filters?.status,
        }
      );

      if (!result.success) {
        throw new Error(result.error || "Error al cargar los turnos");
      }

      return result.appointments || [];
    },
    enabled: !!profile?.organization_id,
    staleTime: 1000 * 60, // 1 minuto
    ...options,
  });

  return {
    appointments: query.data || [],
    loading: query.isLoading,
    error: query.error?.message || null,
    isRefetching: query.isRefetching,
    refetch: query.refetch,
  };
}

/**
 * Hook for creating appointments with optimistic updates and Zod validation
 */
export function useCreateAppointment() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      if (!profile?.organization_id || !profile?.user_id) {
        throw new Error("No se encontró la información de la organización");
      }

      // Validate data with Zod schema
      try {
        const validatedData = appointmentFormSchema.parse(data);

        const result = await AppointmentService.create(
          validatedData,
          profile.organization_id,
          profile.user_id
        );

        if (!result.success) {
          throw new Error(result.error || "Error al crear el turno");
        }

        return result.appointment;
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
      // Invalidate and refetch appointments queries
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

/**
 * Hook for updating appointment status with Zod validation
 */
export function useUpdateAppointmentStatus() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      newStatus,
      reason,
    }: {
      appointmentId: string;
      newStatus: AppointmentStatus;
      reason?: string;
    }) => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      // Validate data with Zod schema
      try {
        const validatedData = appointmentUpdateStatusSchema.parse({
          appointmentId,
          newStatus,
          reason,
        });

        const result = await AppointmentService.updateStatus(
          validatedData.appointmentId,
          validatedData.newStatus,
          profile.organization_id,
          profile?.user_id,
          validatedData.reason
        );

        if (!result.success) {
          throw new Error(result.error || "Error al actualizar el estado");
        }

        return result;
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
      // Invalidate appointments queries
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

/**
 * Hook for deleting appointments (soft delete via cancellation)
 */
export function useDeleteAppointment() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      reason,
    }: {
      appointmentId: string;
      reason?: string;
    }) => {
      if (!profile?.organization_id || !profile?.user_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await AppointmentService.delete(
        appointmentId,
        profile.organization_id,
        profile.user_id,
        reason
      );

      if (!result.success) {
        throw new Error(result.error || "Error al eliminar el turno");
      }

      return result;
    },
    onSuccess: () => {
      // Invalidate appointments queries
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

/**
 * Hook for sending appointment reminders with Zod validation
 */
export function useSendReminder() {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      method = "whatsapp",
    }: {
      appointmentId: string;
      method?: "whatsapp" | "sms" | "email";
    }) => {
      if (!profile?.organization_id || !profile?.user_id) {
        throw new Error("No se encontró la información de la organización");
      }

      // Validate data with Zod schema
      try {
        const validatedData = sendReminderSchema.parse({
          appointmentId,
          method,
        });

        const result = await AppointmentService.sendReminder(
          validatedData.appointmentId,
          profile.organization_id,
          profile.user_id,
          validatedData.method
        );

        if (!result.success) {
          throw new Error(result.error || "Error al enviar el recordatorio");
        }

        return result;
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
      // Invalidate appointments queries to update reminder status
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

/**
 * Hook for checking availability with Zod validation
 * Returns a function that can be called to check availability
 */
export function useCheckAvailability() {
  const { profile } = useAuth();

  return useCallback(
    async (
      date: string,
      startTime: string,
      endTime: string,
      staffId: string,
      excludeAppointmentId?: string
    ) => {
      if (!profile?.organization_id) {
        return {
          available: false,
          reason: "No se encontró la información de la organización",
        };
      }

      // Validate data with Zod schema
      try {
        const validatedData = checkAvailabilitySchema.parse({
          date,
          startTime,
          endTime,
          staffId,
          excludeAppointmentId,
        });

        return await AppointmentService.checkAvailability(
          validatedData.date,
          validatedData.startTime,
          validatedData.endTime,
          validatedData.staffId,
          profile.organization_id,
          validatedData.excludeAppointmentId
        );
      } catch (error) {
        if (error instanceof ZodError) {
          const firstError = error.issues[0];
          return {
            available: false,
            reason: `Validación fallida: ${firstError.message}`,
          };
        }
        throw error;
      }
    },
    [profile?.organization_id]
  );
}

/**
 * Hook for getting appointment statistics
 */
export function useAppointmentStatistics(startDate: string, endDate: string) {
  const { profile } = useAuth();

  return useQuery({
    queryKey: appointmentKeys.statistics(
      profile?.organization_id || "",
      startDate,
      endDate
    ),
    queryFn: async () => {
      if (!profile?.organization_id) {
        throw new Error("No se encontró la información de la organización");
      }

      const result = await AppointmentService.getStatistics(
        profile.organization_id,
        startDate,
        endDate
      );

      if (!result.success) {
        throw new Error(result.error || "Error al cargar estadísticas");
      }

      return result.stats;
    },
    enabled: !!profile?.organization_id,
    staleTime: 1000 * 60 * 5, // 5 minutos - statistics change less frequently
  });
}
