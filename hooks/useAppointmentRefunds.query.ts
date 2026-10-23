import { appointmentKeys } from "@/hooks/useAppointments.query";
import {
  AppointmentRefundsService,
  type NewAppointmentRefund,
  type RefundDecision,
} from "@/services/appointment-refunds.service";
import { AppointmentService } from "@/services/appointments.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

const refundKeys = {
  list: (appointmentId: string) =>
    [...appointmentKeys.all, "refunds", appointmentId] as const,
};

/** Refunds of one appointment with their history (TUR0010). */
export function useAppointmentRefunds(appointmentId: string, enabled = true) {
  return useQuery({
    queryKey: refundKeys.list(appointmentId),
    queryFn: () => AppointmentRefundsService.list(appointmentId),
    enabled,
  });
}

/**
 * Register a refund or decide a pending one. Both resolve to the appointment as
 * it is now (refund totals and deposit change) for the open detail.
 */
export function useRegisterAppointmentRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      refund,
    }: {
      appointmentId: string;
      refund: NewAppointmentRefund;
    }) => {
      const result = await AppointmentRefundsService.register(appointmentId, refund);
      if (!result.success) throw new Error(result.error);
      return AppointmentService.getWithDetails(appointmentId);
    },
    onSuccess: (_fresh, { appointmentId }) =>
      queryClient.invalidateQueries({ queryKey: refundKeys.list(appointmentId) }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}

export function useDecideAppointmentRefund() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      appointmentId,
      refundId,
      decision,
    }: {
      appointmentId: string;
      refundId: string;
      decision: RefundDecision;
    }) => {
      const result = await AppointmentRefundsService.decide(refundId, decision);
      if (!result.success) throw new Error(result.error);
      return AppointmentService.getWithDetails(appointmentId);
    },
    onSuccess: (_fresh, { appointmentId }) =>
      queryClient.invalidateQueries({ queryKey: refundKeys.list(appointmentId) }),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: appointmentKeys.all });
    },
  });
}
