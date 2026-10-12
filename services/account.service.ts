/**
 * Account Service
 * What a signed-in user changes about themselves. RLS (migration 048) lets a
 * user update only their own profile, and the prevent_role_org_change trigger
 * keeps role, organization and activation out of reach. The owner's phone
 * lives in their organization, which only they and the admins can update.
 */

import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";

export class AccountService {
  static async updateName(
    userId: string,
    fullName: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("user_profiles")
      .update({ full_name: fullName })
      .eq("user_id", userId)
      .select("id");

    if (error || !data?.length) {
      void Logger.error("Error updating account name:", error);
      return {
        success: false,
        error: "No pudimos guardar tu nombre. Inténtalo de nuevo.",
      };
    }
    return { success: true };
  }

  static async getOwnerPhone(organizationId: string): Promise<string> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("organizations")
      .select("owner_phone")
      .eq("id", organizationId)
      .single();
    if (error) throw error;
    return data.owner_phone ?? "";
  }

  static async updateOwnerPhone(
    organizationId: string,
    phone: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("organizations")
      .update({ owner_phone: phone })
      .eq("id", organizationId)
      .select("id");

    if (error || !data?.length) {
      void Logger.error("Error updating owner phone:", error);
      return {
        success: false,
        error: "No pudimos guardar tu teléfono. Inténtalo de nuevo.",
      };
    }
    return { success: true };
  }

  static async changePassword(
    password: string
  ): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      void Logger.error("Error changing password:", error);
      return {
        success: false,
        error:
          error.code === "same_password"
            ? "La contraseña nueva es igual a la actual."
            : "No pudimos cambiar la contraseña. Inténtalo de nuevo.",
      };
    }
    return { success: true };
  }
}
