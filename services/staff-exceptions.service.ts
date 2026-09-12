import type { StaffExceptionInput } from "@/schemas/staff-exception.schema";
import type { StaffException } from "@/types/appointments";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";
import { addDays, format, parseISO } from "date-fns";
import { fromZonedTime } from "date-fns-tz";

/**
 * Days off of a staff member (staff_id set, type time_off) or closures of the
 * whole business (staff_id NULL, type holiday). The booking engine
 * (migration 029) never offers times that overlap them.
 */
export class StaffExceptionService {
  /** Current and future exceptions; `staffId` null = business-wide closures. */
  static async list(
    organizationId: string,
    staffId: string | null
  ): Promise<{ success: boolean; error?: string; exceptions?: StaffException[] }> {
    try {
      const supabase = createClient();
      let query = supabase
        .from("staff_exceptions")
        .select("*")
        .eq("organization_id", organizationId)
        .gte("end_datetime", new Date().toISOString())
        .order("start_datetime");
      query = staffId ? query.eq("staff_id", staffId) : query.is("staff_id", null);

      const { data, error } = await query;
      if (error) {
        void Logger.error("Error loading staff exceptions", error, {
          organizationId,
          staffId,
        });
        return { success: false, error: "No se pudieron cargar los días libres" };
      }
      return { success: true, exceptions: data ?? [] };
    } catch (error) {
      void Logger.error("Unexpected error loading staff exceptions", error);
      return { success: false, error: "Error inesperado al cargar los días libres" };
    }
  }

  /**
   * Stores whole days in the business timezone: [from 00:00, day after `to` 00:00).
   */
  static async create(params: {
    organizationId: string;
    staffId: string | null;
    timezone: string;
    input: StaffExceptionInput;
  }): Promise<{ success: boolean; error?: string }> {
    const { organizationId, staffId, timezone, input } = params;
    try {
      const start = fromZonedTime(`${input.from}T00:00:00`, timezone);
      const dayAfter = format(addDays(parseISO(input.to), 1), "yyyy-MM-dd");
      const end = fromZonedTime(`${dayAfter}T00:00:00`, timezone);

      const supabase = createClient();
      const { error } = await supabase.from("staff_exceptions").insert({
        organization_id: organizationId,
        staff_id: staffId,
        exception_type: staffId ? "time_off" : "holiday",
        start_datetime: start.toISOString(),
        end_datetime: end.toISOString(),
        title: input.title || (staffId ? "Día libre" : "Cierre del negocio"),
      });

      if (error) {
        void Logger.error("Error creating staff exception", error, {
          organizationId,
          staffId,
        });
        return { success: false, error: "No se pudo guardar: " + error.message };
      }
      return { success: true };
    } catch (error) {
      void Logger.error("Unexpected error creating staff exception", error);
      return { success: false, error: "Error inesperado al guardar" };
    }
  }

  static async delete(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("staff_exceptions").delete().eq("id", id);
      if (error) {
        void Logger.error("Error deleting staff exception", error, { id });
        return { success: false, error: "No se pudo eliminar: " + error.message };
      }
      return { success: true };
    } catch (error) {
      void Logger.error("Unexpected error deleting staff exception", error);
      return { success: false, error: "Error inesperado al eliminar" };
    }
  }
}
