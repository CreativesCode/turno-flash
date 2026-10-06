/**
 * Team Service
 * The employees (role staff) of an organization and their access.
 * RLS (migration 048) limits an owner to their own organization, and the
 * prevent_role_org_change trigger only lets them switch access of staff.
 */

import type { UserProfile } from "@/types/auth";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";

export class TeamService {
  static async listStaff(
    organizationId: string
  ): Promise<{ data: UserProfile[]; error?: string }> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("role", "staff")
      .order("created_at", { ascending: true });

    if (error) {
      void Logger.error("Error loading team:", error);
      return { data: [], error: "No pudimos cargar tu equipo." };
    }
    return { data: data ?? [] };
  }

  /** Removes (isActive=false) or restores the access of an employee. */
  static async setAccess(
    userId: string,
    isActive: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ is_active: isActive })
      .eq("user_id", userId)
      .select("id");

    if (error || !data?.length) {
      void Logger.error("Error changing member access:", error);
      return {
        success: false,
        error: "No pudimos cambiar el acceso. Inténtalo de nuevo.",
      };
    }
    return { success: true };
  }
}
