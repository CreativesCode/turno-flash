import {
  staffScheduleSchema,
  type StaffScheduleInput,
} from "@/schemas/staff-schedule.schema";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";

/**
 * Service Layer for a staff member's weekly schedule and the services they
 * perform. Both drive the public booking page (PRP-001): a staff member
 * without schedule or without services is never offered online.
 */
export class StaffScheduleService {
  static async get(staffId: string): Promise<{
    success: boolean;
    error?: string;
    schedule?: StaffScheduleInput;
  }> {
    try {
      const supabase = createClient();
      const [
        { data: ranges, error: rangesError },
        { data: services, error: servicesError },
      ] = await Promise.all([
        supabase
          .from("staff_availability")
          .select("day_of_week, start_time, end_time")
          .eq("staff_id", staffId)
          .order("day_of_week")
          .order("start_time"),
        supabase
          .from("staff_services")
          .select("service_id")
          .eq("staff_id", staffId),
      ]);

      if (rangesError || servicesError) {
        void Logger.error(
          "Error loading staff schedule",
          rangesError ?? servicesError,
          { staffId }
        );
        return { success: false, error: "No se pudo cargar el horario" };
      }

      return {
        success: true,
        schedule: {
          ranges: (ranges ?? []).map((r) => ({
            day_of_week: r.day_of_week,
            start_time: r.start_time.slice(0, 5),
            end_time: r.end_time.slice(0, 5),
          })),
          service_ids: (services ?? []).map((s) => s.service_id),
        },
      };
    } catch (error) {
      void Logger.error("Unexpected error loading staff schedule", error, {
        staffId,
      });
      return { success: false, error: "Error inesperado al cargar el horario" };
    }
  }

  /** Atomically replaces the schedule and the service assignments (RPC). */
  static async save(
    staffId: string,
    input: StaffScheduleInput
  ): Promise<{ success: boolean; error?: string }> {
    const parsed = staffScheduleSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message ?? "Datos inválidos",
      };
    }

    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("save_staff_schedule", {
        p_staff_id: staffId,
        p_ranges: parsed.data.ranges,
        p_service_ids: parsed.data.service_ids,
      });

      if (error) {
        void Logger.error("Error saving staff schedule", error, { staffId });
        return {
          success: false,
          error: "No se pudo guardar el horario: " + error.message,
        };
      }

      return { success: true };
    } catch (error) {
      void Logger.error("Unexpected error saving staff schedule", error, {
        staffId,
      });
      return { success: false, error: "Error inesperado al guardar el horario" };
    }
  }
}
