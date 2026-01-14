/**
 * DEPRECATED: This file is kept for backward compatibility.
 * Please use the new React Query hooks from './useAppointments.query.ts' instead.
 *
 * Migration guide:
 * - useAppointments() -> useAppointments() (same API with React Query)
 * - createAppointment() -> useCreateAppointment().mutate()
 * - updateStatus() -> useUpdateAppointmentStatus().mutate()
 * - deleteAppointment() -> useDeleteAppointment().mutate()
 * - sendReminder() -> useSendReminder().mutate()
 * - checkAvailability() -> useCheckAvailability()
 * - getStatistics() -> useAppointmentStatistics()
 */

import { useAuth } from "@/contexts/auth-context";
import { AppointmentFormData, AppointmentStatus } from "@/types/appointments";
import { useCallback } from "react";
import {
  useAppointments as useAppointmentsQuery,
  useCheckAvailability as useCheckAvailabilityQuery,
  useCreateAppointment as useCreateAppointmentMutation,
  useDeleteAppointment as useDeleteAppointmentMutation,
  useSendReminder as useSendReminderMutation,
  useUpdateAppointmentStatus as useUpdateAppointmentStatusMutation,
} from "./useAppointments.query";

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
 * Custom hook for managing appointments
 * NOW POWERED BY REACT QUERY! 🚀
 *
 * This hook now uses React Query under the hood for:
 * - Automatic caching
 * - Smart refetching
 * - Optimistic updates
 * - Better performance
 *
 * The API remains the same for backward compatibility.
 */
export function useAppointments(filters?: AppointmentFilters) {
  const { profile } = useAuth();

  // Use React Query hooks
  const { appointments, loading, error, refetch } =
    useAppointmentsQuery(filters);
  const createMutation = useCreateAppointmentMutation();
  const updateStatusMutation = useUpdateAppointmentStatusMutation();
  const deleteMutation = useDeleteAppointmentMutation();
  const sendReminderMutation = useSendReminderMutation();
  const checkAvailabilityFn = useCheckAvailabilityQuery();

  /**
   * Create a new appointment
   */
  const createAppointment = useCallback(
    async (data: AppointmentFormData) => {
      if (!profile?.organization_id || !profile?.user_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      try {
        await createMutation.mutateAsync(data);
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Error al crear el turno",
        };
      }
    },
    [profile?.organization_id, profile?.user_id, createMutation]
  );

  /**
   * Update appointment status
   */
  const updateStatus = useCallback(
    async (
      appointmentId: string,
      newStatus: AppointmentStatus,
      reason?: string
    ) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      try {
        await updateStatusMutation.mutateAsync({
          appointmentId,
          newStatus,
          reason,
        });
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al actualizar el estado",
        };
      }
    },
    [profile?.organization_id, updateStatusMutation]
  );

  /**
   * Delete an appointment (soft delete via cancellation)
   */
  const deleteAppointment = useCallback(
    async (appointmentId: string, reason?: string) => {
      if (!profile?.organization_id || !profile?.user_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      try {
        await deleteMutation.mutateAsync({ appointmentId, reason });
        return { success: true };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error ? err.message : "Error al eliminar el turno",
        };
      }
    },
    [profile?.organization_id, profile?.user_id, deleteMutation]
  );

  /**
   * Send reminder for an appointment
   */
  const sendReminder = useCallback(
    async (
      appointmentId: string,
      method: "whatsapp" | "sms" | "email" = "whatsapp"
    ) => {
      if (!profile?.organization_id || !profile?.user_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      try {
        const result = await sendReminderMutation.mutateAsync({
          appointmentId,
          method,
        });
        return { success: true, whatsappUrl: result.whatsappUrl };
      } catch (err) {
        return {
          success: false,
          error:
            err instanceof Error
              ? err.message
              : "Error al enviar el recordatorio",
        };
      }
    },
    [profile?.organization_id, profile?.user_id, sendReminderMutation]
  );

  /**
   * Check availability for a time slot
   */
  const checkAvailability = useCallback(
    async (
      date: string,
      startTime: string,
      endTime: string,
      staffId: string,
      excludeAppointmentId?: string
    ) => {
      return await checkAvailabilityFn(
        date,
        startTime,
        endTime,
        staffId,
        excludeAppointmentId
      );
    },
    [checkAvailabilityFn]
  );

  /**
   * Get appointment statistics
   * NOTE: This is now handled by useAppointmentStatistics hook
   * This wrapper is kept for backward compatibility
   */
  const getStatistics = useCallback(
    async (startDate: string, endDate: string) => {
      console.warn(
        "getStatistics is deprecated. Use useAppointmentStatistics hook instead."
      );

      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

      // Import dynamically to avoid circular dependencies
      const { AppointmentService } = await import(
        "@/services/appointments.service"
      );
      return await AppointmentService.getStatistics(
        profile.organization_id,
        startDate,
        endDate
      );
    },
    [profile?.organization_id]
  );

  /**
   * Refresh appointments data
   */
  const refresh = useCallback(() => {
    return refetch();
  }, [refetch]);

  return {
    appointments,
    loading,
    error,
    createAppointment,
    updateStatus,
    deleteAppointment,
    sendReminder,
    checkAvailability,
    getStatistics,
    refresh,
  };
}
