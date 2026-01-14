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

  const filtersWithDates = useMemo(
    () => ({
      ...filters,
      startDate,
      endDate,
    }),
    [filters, startDate, endDate]
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
 * Hook for creating appointments with OPTIMISTIC UPDATES and Zod validation
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
    // OPTIMISTIC UPDATE: Add appointment to UI immediately
    onMutate: async (newAppointment) => {
      if (!profile?.organization_id || !profile?.user_id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: appointmentKeys.lists() });

      // Snapshot previous values
      const previousAppointments = queryClient.getQueriesData({
        queryKey: appointmentKeys.lists(),
      });

      // Create temporary optimistic appointment with placeholder ID
      // Using type assertion since this is a temporary optimistic object
      const optimisticAppointment = {
        id: `temp-${Date.now()}`,
        organization_id: profile.organization_id,
        customer_id: newAppointment.customer_id,
        service_id: newAppointment.service_id,
        staff_id: newAppointment.staff_id || null,
        appointment_date: newAppointment.appointment_date,
        start_time: newAppointment.start_time,
        end_time: newAppointment.end_time,
        status: newAppointment.status || "confirmed",
        notes: newAppointment.notes || null,
        internal_notes: newAppointment.internal_notes || null,
        appointment_number: null,
        confirmation_sent_at: null,
        feedback: null,
        payment_method: newAppointment.payment_method || null,
        price_charged: newAppointment.price_charged || null,
        rating: null,
        reminder_method: null,
        source: newAppointment.source || null,
        was_paid: newAppointment.was_paid || false,
        customer_first_name: "",
        customer_last_name: "",
        customer_phone: "",
        service_name: "",
        duration_minutes: 0,
        organization_name: "",
        organization_timezone: "UTC",
        staff_first_name: null,
        staff_last_name: null,
        staff_nickname: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        created_by: profile.user_id,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        reminder_sent_at: null,
        client_confirmed_at: null,
        cancelled_at: null,
        cancelled_by: null,
        cancellation_reason: null,
        actual_start_time: null,
        actual_end_time: null,
        service_price: null,
        customer_email: null,
      } as AppointmentWithDetails;

      // Optimistically add to all appointment list queries
      queryClient.setQueriesData(
        { queryKey: appointmentKeys.lists() },
        (old: AppointmentWithDetails[] | undefined) => {
          if (!old) return [optimisticAppointment];
          return [...old, optimisticAppointment];
        }
      );

      return { previousAppointments };
    },
    // ROLLBACK on error
    onError: (_error, _variables, context) => {
      if (context?.previousAppointments) {
        context.previousAppointments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    // Refetch to get real data from server
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

/**
 * Hook for updating appointment status with Zod validation and OPTIMISTIC UPDATES
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
    // OPTIMISTIC UPDATE: Update UI immediately before server response
    onMutate: async ({ appointmentId, newStatus }) => {
      if (!profile?.organization_id) return;

      // Cancel outgoing refetches to avoid overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: appointmentKeys.lists() });

      // Snapshot previous values for rollback
      const previousAppointments = queryClient.getQueriesData({
        queryKey: appointmentKeys.lists(),
      });

      // Optimistically update all appointment list queries
      queryClient.setQueriesData(
        { queryKey: appointmentKeys.lists() },
        (old: AppointmentWithDetails[] | undefined) => {
          if (!old) return old;
          return old.map((appointment) =>
            appointment.id === appointmentId
              ? { ...appointment, status: newStatus }
              : appointment
          );
        }
      );

      // Return context with previous values for rollback
      return { previousAppointments };
    },
    // ROLLBACK: Revert optimistic update on error
    onError: (_error, _variables, context) => {
      if (context?.previousAppointments) {
        // Restore all previous query states
        context.previousAppointments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    // Refetch from server to ensure consistency
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: appointmentKeys.lists() });
      queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

/**
 * Hook for deleting appointments (soft delete via cancellation) with OPTIMISTIC UPDATES
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
    // OPTIMISTIC UPDATE: Mark as cancelled immediately
    onMutate: async ({ appointmentId }) => {
      if (!profile?.organization_id) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: appointmentKeys.lists() });

      // Snapshot previous values
      const previousAppointments = queryClient.getQueriesData({
        queryKey: appointmentKeys.lists(),
      });

      // Optimistically update status to "cancelled"
      queryClient.setQueriesData(
        { queryKey: appointmentKeys.lists() },
        (old: AppointmentWithDetails[] | undefined) => {
          if (!old) return old;
          return old.map((appointment) =>
            appointment.id === appointmentId
              ? { ...appointment, status: "cancelled" as AppointmentStatus }
              : appointment
          );
        }
      );

      return { previousAppointments };
    },
    // ROLLBACK on error
    onError: (_error, _variables, context) => {
      if (context?.previousAppointments) {
        context.previousAppointments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    // Refetch to ensure consistency
    onSettled: () => {
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

  const organizationId = useMemo(
    () => profile?.organization_id,
    [profile?.organization_id]
  );

  return useCallback(
    async (
      date: string,
      startTime: string,
      endTime: string,
      staffId: string,
      excludeAppointmentId?: string
    ) => {
      if (!organizationId) {
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
          organizationId,
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
    [organizationId]
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
