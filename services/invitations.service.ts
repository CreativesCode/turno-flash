/**
 * Invitation Service
 * Invites users by email through the `invite-user` Edge Function
 * (static export: there are no API routes).
 */

import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";

const SESSION_EXPIRED = "Sesión expirada. Por favor, vuelve a iniciar sesión.";

export class InvitationService {
  /**
   * Sends an invitation email with a link to set the password.
   * @param organizationId Owners pass their organization so the invitee joins
   *   it; admins omit it and the invitee stays without organization.
   */
  static async invite(
    email: string,
    organizationId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) {
        return {
          success: false,
          error: "Falta configuración de Supabase (URL/ANON KEY).",
        };
      }

      const supabase = createClient();

      // Verificar que la sesión es válida (UX: mensaje claro si expiró)
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: SESSION_EXPIRED };
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();
      if (sessionError || !session?.access_token) {
        return { success: false, error: SESSION_EXPIRED };
      }

      // Asegurar token con forma de JWT (a.b.c). Si no, refrescar sesión.
      let accessToken = session.access_token;
      if (accessToken.split(".").length !== 3) {
        const { data: refreshed, error: refreshError } =
          await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session?.access_token) {
          return { success: false, error: SESSION_EXPIRED };
        }
        accessToken = refreshed.session.access_token;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/auth/callback?type=invite`,
          ...(organizationId ? { organization_id: organizationId } : {}),
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() };

      if (!response.ok || data?.error) {
        void Logger.error("Error inviting user", data);
        return {
          success: false,
          error: data?.error || "Error al enviar la invitación",
        };
      }

      return { success: true };
    } catch (err) {
      void Logger.error("Unexpected error inviting user", err);
      return {
        success: false,
        error: "Error al enviar la invitación. Intenta nuevamente.",
      };
    }
  }
}
