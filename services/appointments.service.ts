import { APPOINTMENT_STATUS } from "@/config/constants";
import {
  AppointmentFormData,
  AppointmentStatus,
  AppointmentWithDetails,
  Service,
} from "@/types/appointments";
import { getTimestamp } from "@/utils/date";
import { createClient } from "@/utils/supabase/client";

/**
 * Service Layer for Appointment Management
 * Handles all business logic related to appointments
 */
export class AppointmentService {
  /**
   * Map database view data to AppointmentWithDetails
   */
  private static mapToAppointmentWithDetails(
    data: any
  ): AppointmentWithDetails {
    return {
      ...data,
      customer_first_name: data.customer_first_name || "",
      customer_last_name: data.customer_last_name || "",
      customer_phone: data.customer_phone || "",
      service_name: data.service_name || "",
      duration_minutes: data.duration_minutes || 0,
      organization_name: data.organization_name || "",
      organization_timezone: data.organization_timezone || "UTC",
    } as AppointmentWithDetails;
  }

  /**
   * Validate appointment form data
   */
  private static validateAppointmentData(data: AppointmentFormData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.customer_id) {
      errors.push("Debes seleccionar un cliente");
    }

    if (!data.service_id) {
      errors.push("Debes seleccionar un servicio");
    }

    if (!data.appointment_date) {
      errors.push("Debes seleccionar una fecha");
    }

    if (!data.start_time) {
      errors.push("Debes seleccionar una hora de inicio");
    }

    if (!data.end_time) {
      errors.push("Debes seleccionar una hora de fin");
    }

    // Validate that start time is before end time
    if (data.start_time && data.end_time && data.start_time >= data.end_time) {
      errors.push("La hora de inicio debe ser anterior a la hora de fin");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate if status transition is allowed
   */
  private static isValidStatusTransition(
    currentStatus: AppointmentStatus,
    newStatus: AppointmentStatus
  ): boolean {
    const allowedTransitions: Record<AppointmentStatus, AppointmentStatus[]> = {
      pending: [
        APPOINTMENT_STATUS.CONFIRMED,
        APPOINTMENT_STATUS.CANCELLED,
        APPOINTMENT_STATUS.NO_SHOW,
        APPOINTMENT_STATUS.CHECKED_IN,
        APPOINTMENT_STATUS.IN_PROGRESS,
        APPOINTMENT_STATUS.COMPLETED,
      ],
      confirmed: [
        APPOINTMENT_STATUS.REMINDED,
        APPOINTMENT_STATUS.CLIENT_CONFIRMED,
        APPOINTMENT_STATUS.CHECKED_IN,
        APPOINTMENT_STATUS.IN_PROGRESS,
        APPOINTMENT_STATUS.COMPLETED,
        APPOINTMENT_STATUS.CANCELLED,
        APPOINTMENT_STATUS.NO_SHOW,
      ],
      reminded: [
        APPOINTMENT_STATUS.CLIENT_CONFIRMED,
        APPOINTMENT_STATUS.CHECKED_IN,
        APPOINTMENT_STATUS.IN_PROGRESS,
        APPOINTMENT_STATUS.COMPLETED,
        APPOINTMENT_STATUS.CANCELLED,
        APPOINTMENT_STATUS.NO_SHOW,
      ],
      client_confirmed: [
        APPOINTMENT_STATUS.CHECKED_IN,
        APPOINTMENT_STATUS.IN_PROGRESS,
        APPOINTMENT_STATUS.COMPLETED,
        APPOINTMENT_STATUS.CANCELLED,
        APPOINTMENT_STATUS.NO_SHOW,
      ],
      checked_in: [APPOINTMENT_STATUS.IN_PROGRESS, APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW],
      in_progress: [APPOINTMENT_STATUS.COMPLETED, APPOINTMENT_STATUS.CANCELLED],
      completed: [APPOINTMENT_STATUS.RESCHEDULED], // Only allow rescheduling from completed
      cancelled: [],
      no_show: [],
      rescheduled: [],
    };

    return allowedTransitions[currentStatus]?.includes(newStatus) || false;
  }

  /**
   * Create a new appointment
   */
  static async create(
    data: AppointmentFormData,
    organizationId: string,
    userId: string
  ): Promise<{
    success: boolean;
    error?: string;
    appointment?: AppointmentWithDetails;
  }> {
    try {
      // Validate input data
      const validation = this.validateAppointmentData(data);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.errors.join(", "),
        };
      }

      const supabase = createClient();

      // Check if service exists and get its details
      const { data: service, error: serviceError } = await supabase
        .from("services")
        .select("*")
        .eq("id", data.service_id)
        .eq("organization_id", organizationId)
        .single();

      if (serviceError || !service) {
        return {
          success: false,
          error: "El servicio seleccionado no existe",
        };
      }

      // Check if customer exists
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id")
        .eq("id", data.customer_id)
        .eq("organization_id", organizationId)
        .single();

      if (customerError || !customer) {
        return {
          success: false,
          error: "El cliente seleccionado no existe",
        };
      }

      // Check availability if staff is selected
      if (data.staff_id) {
        const availabilityCheck = await this.checkAvailability(
          data.appointment_date,
          data.start_time,
          data.end_time,
          data.staff_id,
          organizationId
        );

        if (!availabilityCheck.available) {
          return {
            success: false,
            error:
              availabilityCheck.reason ||
              "El horario seleccionado no está disponible",
          };
        }
      }

      // Determine final status based on service requirements
      const finalStatus = service.requires_approval
        ? APPOINTMENT_STATUS.PENDING
        : data.status || APPOINTMENT_STATUS.CONFIRMED;

      // Create appointment
      const { data: appointment, error: insertError } = await supabase
        .from("appointments")
        .insert({
          ...data,
          status: finalStatus,
          organization_id: organizationId,
          created_by: userId,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating appointment:", insertError);
        return {
          success: false,
          error: "Error al crear el turno: " + insertError.message,
        };
      }

      return {
        success: true,
        appointment: appointment as AppointmentWithDetails,
      };
    } catch (error) {
      console.error("Unexpected error creating appointment:", error);
      return {
        success: false,
        error: "Error inesperado al crear el turno",
      };
    }
  }

  /**
   * Update appointment status with validation
   */
  static async updateStatus(
    appointmentId: string,
    newStatus: AppointmentStatus,
    organizationId: string,
    userId?: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();

      // Get current appointment
      const { data: appointment, error: fetchError } = await supabase
        .from("appointments")
        .select("*")
        .eq("id", appointmentId)
        .eq("organization_id", organizationId)
        .single();

      if (fetchError || !appointment) {
        return {
          success: false,
          error: "El turno no existe",
        };
      }

      // Validate status transition
      if (
        !this.isValidStatusTransition(
          appointment.status as AppointmentStatus,
          newStatus
        )
      ) {
        return {
          success: false,
          error: `No se puede cambiar de "${appointment.status}" a "${newStatus}"`,
        };
      }

      // Prepare update data
      const updateData: Record<string, string | null | undefined> = {
        status: newStatus,
      };

      // Add metadata based on status
      if (newStatus === APPOINTMENT_STATUS.CANCELLED) {
        updateData.cancelled_at = getTimestamp();
        updateData.cancelled_by = userId;
        if (reason) {
          updateData.cancellation_reason = reason;
        }
      } else if (newStatus === APPOINTMENT_STATUS.CLIENT_CONFIRMED) {
        updateData.client_confirmed_at = getTimestamp();
      } else if (newStatus === APPOINTMENT_STATUS.REMINDED) {
        updateData.reminder_sent_at = getTimestamp();
      } else if (newStatus === APPOINTMENT_STATUS.IN_PROGRESS) {
        updateData.actual_start_time = getTimestamp();
      } else if (newStatus === APPOINTMENT_STATUS.COMPLETED) {
        if (!appointment.actual_start_time) {
          updateData.actual_start_time = getTimestamp();
        }
        updateData.actual_end_time = getTimestamp();
      }

      // Update appointment
      const { error: updateError } = await supabase
        .from("appointments")
        .update(updateData)
        .eq("id", appointmentId);

      if (updateError) {
        console.error("Error updating appointment status:", updateError);
        return {
          success: false,
          error: "Error al actualizar el estado: " + updateError.message,
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Unexpected error updating status:", error);
      return {
        success: false,
        error: "Error inesperado al actualizar el estado",
      };
    }
  }

  /**
   * Check if a time slot is available for a staff member
   */
  static async checkAvailability(
    date: string,
    startTime: string,
    endTime: string,
    staffId: string,
    organizationId: string,
    excludeAppointmentId?: string
  ): Promise<{ available: boolean; reason?: string }> {
    try {
      const supabase = createClient();

      // Check for overlapping appointments
      let query = supabase
        .from("appointments")
        .select("id, start_time, end_time")
        .eq("organization_id", organizationId)
        .eq("staff_id", staffId)
        .eq("appointment_date", date)
        .in("status", [
          APPOINTMENT_STATUS.PENDING,
          APPOINTMENT_STATUS.CONFIRMED,
          APPOINTMENT_STATUS.REMINDED,
          APPOINTMENT_STATUS.CLIENT_CONFIRMED,
          APPOINTMENT_STATUS.CHECKED_IN,
          APPOINTMENT_STATUS.IN_PROGRESS,
        ]);

      if (excludeAppointmentId) {
        query = query.neq("id", excludeAppointmentId);
      }

      const { data: appointments, error } = await query;

      if (error) {
        console.error("Error checking availability:", error);
        return {
          available: false,
          reason: "Error al verificar disponibilidad",
        };
      }

      // Check for time conflicts
      const hasConflict = appointments?.some((apt) => {
        // Check if the new appointment overlaps with existing ones
        return (
          (startTime >= apt.start_time && startTime < apt.end_time) ||
          (endTime > apt.start_time && endTime <= apt.end_time) ||
          (startTime <= apt.start_time && endTime >= apt.end_time)
        );
      });

      if (hasConflict) {
        return {
          available: false,
          reason: "El profesional ya tiene un turno en ese horario",
        };
      }

      // TODO: Check staff availability schedule
      // TODO: Check staff exceptions (time off, holidays, etc.)

      return { available: true };
    } catch (error) {
      console.error("Unexpected error checking availability:", error);
      return {
        available: false,
        reason: "Error inesperado al verificar disponibilidad",
      };
    }
  }

  /**
   * Get appointments for a date range
   */
  static async getByDateRange(
    organizationId: string,
    startDate: string,
    endDate: string,
    filters?: {
      staffId?: string;
      serviceId?: string;
      customerId?: string;
      status?: AppointmentStatus[];
    }
  ): Promise<{
    success: boolean;
    appointments?: AppointmentWithDetails[];
    error?: string;
  }> {
    try {
      const supabase = createClient();

      let query = supabase
        .from("appointments_with_details")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("appointment_date", startDate)
        .lte("appointment_date", endDate)
        .order("appointment_date", { ascending: true })
        .order("start_time", { ascending: true });

      // Apply filters
      if (filters?.staffId) {
        query = query.eq("staff_id", filters.staffId);
      }
      if (filters?.serviceId) {
        query = query.eq("service_id", filters.serviceId);
      }
      if (filters?.customerId) {
        query = query.eq("customer_id", filters.customerId);
      }
      if (filters?.status && filters.status.length > 0) {
        query = query.in("status", filters.status);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching appointments:", error);
        return {
          success: false,
          error: "Error al cargar los turnos",
        };
      }

      return {
        success: true,
        appointments: (data || []).map((apt: any) =>
          this.mapToAppointmentWithDetails(apt)
        ),
      };
    } catch (error) {
      console.error("Unexpected error fetching appointments:", error);
      return {
        success: false,
        error: "Error inesperado al cargar los turnos",
      };
    }
  }

  /**
   * Delete an appointment
   */
  static async delete(
    appointmentId: string,
    organizationId: string,
    userId: string,
    reason?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // For audit purposes, we don't delete, we cancel instead
      return await this.updateStatus(
        appointmentId,
        APPOINTMENT_STATUS.CANCELLED,
        organizationId,
        userId,
        reason
      );
    } catch (error) {
      console.error("Unexpected error deleting appointment:", error);
      return {
        success: false,
        error: "Error inesperado al eliminar el turno",
      };
    }
  }

  /**
   * Calculate end time based on service duration
   */
  static calculateEndTime(startTime: string, service: Service): string {
    const [hours, minutes] = startTime.split(":").map(Number);
    const totalMinutes =
      hours * 60 +
      minutes +
      service.duration_minutes +
      (service.buffer_time_minutes ?? 0);
    const endHours = Math.floor(totalMinutes / 60);
    const endMinutes = totalMinutes % 60;

    return `${endHours.toString().padStart(2, "0")}:${endMinutes
      .toString()
      .padStart(2, "0")}`;
  }

  /**
   * Send reminder for appointment
   */
  static async sendReminder(
    appointmentId: string,
    organizationId: string,
    userId: string,
    method: "whatsapp" | "sms" | "email" = "whatsapp"
  ): Promise<{ success: boolean; error?: string; whatsappUrl?: string }> {
    try {
      const supabase = createClient();

      // Get appointment details
      const { data: appointment, error: fetchError } = await supabase
        .from("appointments_with_details")
        .select("*")
        .eq("id", appointmentId)
        .eq("organization_id", organizationId)
        .single();

      if (fetchError || !appointment) {
        return {
          success: false,
          error: "El turno no existe",
        };
      }

      // Log the reminder
      const { error: logError } = await supabase.from("reminder_logs").insert({
        appointment_id: appointmentId,
        reminder_type: "manual",
        method: method,
        status: "sent",
        sent_at: getTimestamp(),
        sent_by: userId,
      });

      if (logError) {
        console.error("Error logging reminder:", logError);
      }

      // Update appointment status to reminded
      await this.updateStatus(
        appointmentId,
        APPOINTMENT_STATUS.REMINDED,
        organizationId,
        userId
      );

      const mappedAppointment = this.mapToAppointmentWithDetails(appointment);

      // Generate WhatsApp URL if method is whatsapp
      if (method === "whatsapp") {
        if (!mappedAppointment.customer_phone) {
          return {
            success: false,
            error: "El cliente no tiene número de teléfono registrado",
          };
        }
        const message = this.generateReminderMessage(mappedAppointment);
        const phone = mappedAppointment.customer_phone.replace(/[^0-9]/g, "");
        const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(
          message
        )}`;

        return {
          success: true,
          whatsappUrl,
        };
      }

      return { success: true };
    } catch (error) {
      console.error("Unexpected error sending reminder:", error);
      return {
        success: false,
        error: "Error inesperado al enviar el recordatorio",
      };
    }
  }

  /**
   * Generate reminder message
   */
  private static generateReminderMessage(
    appointment: AppointmentWithDetails
  ): string {
    const date = new Date(appointment.appointment_date);
    const formattedDate = date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    return `🗓️ *Recordatorio de Turno*

Hola ${appointment.customer_first_name}! 👋

Te recordamos que tienes un turno programado:

📅 *Fecha:* ${formattedDate}
⏰ *Hora:* ${appointment.start_time}
💇 *Servicio:* ${appointment.service_name}
${
  appointment.staff_first_name
    ? `👤 *Con:* ${appointment.staff_first_name}`
    : ""
}

Por favor confirma tu asistencia respondiendo:
✅ *SÍ* - Confirmo mi turno
❌ *NO* - No podré asistir

¡Te esperamos! 🙌`;
  }

  /**
   * Get appointment statistics
   */
  static async getStatistics(
    organizationId: string,
    startDate: string,
    endDate: string
  ): Promise<{
    success: boolean;
    stats?: {
      total: number;
      confirmed: number;
      pending: number;
      completed: number;
      cancelled: number;
      noShow: number;
    };
    error?: string;
  }> {
    try {
      const result = await this.getByDateRange(
        organizationId,
        startDate,
        endDate
      );

      if (!result.success || !result.appointments) {
        return {
          success: false,
          error: result.error || "Error al cargar estadísticas",
        };
      }

      const appointments = result.appointments;
      const stats = {
        total: appointments.length,
        confirmed: appointments.filter(
          (a) => a.status === APPOINTMENT_STATUS.CONFIRMED || a.status === APPOINTMENT_STATUS.CLIENT_CONFIRMED
        ).length,
        pending: appointments.filter((a) => a.status === APPOINTMENT_STATUS.PENDING).length,
        completed: appointments.filter((a) => a.status === APPOINTMENT_STATUS.COMPLETED).length,
        cancelled: appointments.filter((a) => a.status === APPOINTMENT_STATUS.CANCELLED).length,
        noShow: appointments.filter((a) => a.status === APPOINTMENT_STATUS.NO_SHOW).length,
      };

      return { success: true, stats };
    } catch (error) {
      console.error("Unexpected error getting statistics:", error);
      return {
        success: false,
        error: "Error inesperado al cargar estadísticas",
      };
    }
  }
}
