import { bookingSetupKeys } from "@/hooks/useBookingSetup.query";
import type { StaffScheduleInput } from "@/schemas/staff-schedule.schema";
import { StaffScheduleService } from "@/services/staff-schedule.service";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const staffScheduleKeys = {
  all: ["staff-schedule"] as const,
  detail: (staffId: string) => [...staffScheduleKeys.all, staffId] as const,
};

/** Weekly schedule + assigned services of one staff member. */
export function useStaffSchedule(staffId: string | null) {
  return useQuery({
    queryKey: staffScheduleKeys.detail(staffId ?? ""),
    queryFn: async () => {
      const result = await StaffScheduleService.get(staffId as string);
      if (!result.success || !result.schedule) {
        throw new Error(result.error || "No se pudo cargar el horario");
      }
      return result.schedule;
    },
    enabled: !!staffId,
    staleTime: 1000 * 30,
  });
}

export function useSaveStaffSchedule() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      staffId,
      schedule,
    }: {
      staffId: string;
      schedule: StaffScheduleInput;
    }) => {
      const result = await StaffScheduleService.save(staffId, schedule);
      if (!result.success) {
        throw new Error(result.error || "No se pudo guardar el horario");
      }
    },
    onSuccess: (_data, { staffId }) => {
      queryClient.invalidateQueries({
        queryKey: staffScheduleKeys.detail(staffId),
      });
      // The booking page readiness in Settings depends on schedules/services
      queryClient.invalidateQueries({ queryKey: bookingSetupKeys.all });
    },
  });
}
