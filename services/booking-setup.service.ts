import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";

export interface OrganizationBasics {
  slug: string;
  timezone: string;
}

/** Why a staff member will not show up on the public booking page. */
export interface StaffReadiness {
  id: string;
  name: string;
  issues: string[];
}

/**
 * Data the owner needs to set up the public booking page (PRP-001): the
 * shareable slug and which staff members are actually bookable online.
 * Mirrors the eligibility rules of public_booking_staff_for_service (029).
 */
export class BookingSetupService {
  static async getOrganizationBasics(
    organizationId: string
  ): Promise<{ success: boolean; error?: string; basics?: OrganizationBasics }> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("slug, timezone")
      .eq("id", organizationId)
      .single();

    if (error || !data) {
      void Logger.error("Error loading organization basics", error, {
        organizationId,
      });
      return { success: false, error: "No se pudo cargar el negocio" };
    }
    return {
      success: true,
      basics: { slug: data.slug, timezone: data.timezone || "UTC" },
    };
  }

  static async getReadiness(
    organizationId: string
  ): Promise<{ success: boolean; error?: string; staff?: StaffReadiness[] }> {
    const supabase = createClient();
    const { data: staff, error } = await supabase
      .from("staff_members")
      .select("id, first_name, last_name, is_bookable, accepts_online_bookings")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .order("sort_order");

    if (error) {
      void Logger.error("Error loading booking readiness", error, {
        organizationId,
      });
      return { success: false, error: "No se pudo revisar el equipo" };
    }

    const ids = (staff ?? []).map((s) => s.id);
    if (ids.length === 0) return { success: true, staff: [] };

    const [{ data: schedules }, { data: assignments }] = await Promise.all([
      supabase.from("staff_availability").select("staff_id").in("staff_id", ids),
      supabase.from("staff_services").select("staff_id").in("staff_id", ids),
    ]);
    const withSchedule = new Set((schedules ?? []).map((r) => r.staff_id));
    const withServices = new Set((assignments ?? []).map((r) => r.staff_id));

    return {
      success: true,
      staff: (staff ?? []).map((s) => ({
        id: s.id,
        name: `${s.first_name} ${s.last_name}`.trim(),
        issues: [
          s.is_bookable === false && "no reservable",
          s.accepts_online_bookings === false && "no acepta reservas online",
          !withSchedule.has(s.id) && "sin horario",
          !withServices.has(s.id) && "sin servicios asignados",
        ].filter((issue): issue is string => Boolean(issue)),
      })),
    };
  }
}
