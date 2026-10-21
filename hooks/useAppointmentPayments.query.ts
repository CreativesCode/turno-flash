import { appointmentKeys } from "@/hooks/useAppointments.query";
import {
  AppointmentPaymentsService,
  type NewAppointmentPayment,
} from "@/services/appointment-payments.service";
import { AppointmentService } from "@/services/appointments.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const paymentKeys = {
  list: (appointmentId: string) =>
    [...appointmentKeys.all, "payments", appointmentId] as const,
};

/** Payments of one appointment, voided ones included (TUR0008). */
export function useAppointmentPayments(appointmentId: string) {
  return useQuery({
    queryKey: paymentKeys.list(appointmentId),
    queryFn: () => AppointmentPaymentsService.list(appointmentId),
  });
}

/**
 * Register or void a payment. Both resolve to the appointment as it is now
 * (totals, deposit and status may have changed) for the open detail.
 */
export function useRegisterAppointmentPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appointment,
      payment,
    }: {
      appointment: { id: string; organization_id: string };
      payment: NewAppointmentPayment;
    }) => {
      const result = await AppointmentPaymentsService.register(appointment, payment);
      if (!result.success) throw new Error(result.error);
      return AppointmentService.getWithDetails(appointment.id);
    },
    // Awaited: the detail shows the new list as soon as the sheet closes
    onSuccess: (_fresh, { appointment }) =>
      queryClient.invalidateQueries({ queryKey: paymentKeys.list(appointment.id) }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

export function useVoidAppointmentPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      paymentId,
      reason,
    }: {
      appointmentId: string;
      paymentId: string;
      reason: string;
    }) => {
      const result = await AppointmentPaymentsService.void(paymentId, reason);
      if (!result.success) throw new Error(result.error);
      return AppointmentService.getWithDetails(appointmentId);
    },
    onSuccess: (_fresh, { appointmentId }) =>
      queryClient.invalidateQueries({ queryKey: paymentKeys.list(appointmentId) }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}
