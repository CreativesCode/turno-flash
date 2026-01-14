import { useAuth } from "@/contexts/auth-context";
import { AppointmentService } from "@/services/appointments.service";
import {
  AppointmentFormData,
  AppointmentStatus,
  AppointmentWithDetails,
} from "@/types/appointments";
import { useCallback, useEffect, useMemo, useState } from "react";

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
 * Provides CRUD operations and state management for appointments
 */
export function useAppointments(filters?: AppointmentFilters) {
  const { profile } = useAuth();
  const [appointments, setAppointments] = useState<AppointmentWithDetails[]>(
    []
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Serialize status array for stable comparison (prevents infinite loops)
  // Compare by content, not by reference to avoid infinite re-renders
  const statusKey = useMemo(() => {
    if (!filters?.status || filters.status.length === 0) return "";
    return JSON.stringify([...filters.status].sort());
    // We intentionally use join() to compare by content, not array reference
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters?.status?.join(",") ?? ""]);

  /**
   * Load appointments from the service
   */
  const loadAppointments = useCallback(async () => {
    if (!profile?.organization_id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Default to current month if no dates provided
      const today = new Date();
      const startDate =
        filters?.startDate ||
        new Date(today.getFullYear(), today.getMonth(), 1)
          .toISOString()
          .split("T")[0];
      const endDate =
        filters?.endDate ||
        new Date(today.getFullYear(), today.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];

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

      if (result.success && result.appointments) {
        setAppointments(result.appointments);
      } else {
        setError(result.error || "Error al cargar los turnos");
      }
    } catch (err) {
      console.error("Error loading appointments:", err);
      setError("Error inesperado al cargar los turnos");
    } finally {
      setLoading(false);
    }
    // Note: We use statusKey (serialized) instead of filters?.status to compare by content, not reference
    // This prevents infinite loops when array reference changes but content is the same
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile?.organization_id,
    filters?.startDate,
    filters?.endDate,
    filters?.staffId,
    filters?.serviceId,
    filters?.customerId,
    statusKey, // Serialized status array for stable comparison
  ]);

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

      const result = await AppointmentService.create(
        data,
        profile.organization_id,
        profile.user_id
      );

      if (result.success) {
        // Reload appointments to get the updated list
        await loadAppointments();
      }

      return result;
    },
    [profile?.organization_id, profile?.user_id, loadAppointments]
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

      const result = await AppointmentService.updateStatus(
        appointmentId,
        newStatus,
        profile.organization_id,
        profile?.user_id,
        reason
      );

      if (result.success) {
        // Reload appointments to get the updated list
        await loadAppointments();
      }

      return result;
    },
    [profile?.organization_id, profile?.user_id, loadAppointments]
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

      const result = await AppointmentService.delete(
        appointmentId,
        profile.organization_id,
        profile.user_id,
        reason
      );

      if (result.success) {
        // Reload appointments to get the updated list
        await loadAppointments();
      }

      return result;
    },
    [profile?.organization_id, profile?.user_id, loadAppointments]
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

      const result = await AppointmentService.sendReminder(
        appointmentId,
        profile.organization_id,
        profile.user_id,
        method
      );

      if (result.success) {
        // Reload appointments to get the updated status
        await loadAppointments();
      }

      return result;
    },
    [profile?.organization_id, profile?.user_id, loadAppointments]
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
      if (!profile?.organization_id) {
        return {
          available: false,
          reason: "No se encontró la información de la organización",
        };
      }

      return await AppointmentService.checkAvailability(
        date,
        startTime,
        endTime,
        staffId,
        profile.organization_id,
        excludeAppointmentId
      );
    },
    [profile?.organization_id]
  );

  /**
   * Get appointment statistics
   */
  const getStatistics = useCallback(
    async (startDate: string, endDate: string) => {
      if (!profile?.organization_id) {
        return {
          success: false,
          error: "No se encontró la información de la organización",
        };
      }

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
    return loadAppointments();
  }, [loadAppointments]);

  // Auto-load on mount and when filters change
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

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
