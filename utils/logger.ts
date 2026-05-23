import { createClient } from "@/utils/supabase/client";

/**
 * Logger utility para registrar errores y eventos en Supabase.
 *
 * Captura automáticamente user_id, organization_id, url y user_agent
 * (igual que ErrorBoundary) para que cada fila en `error_logs` tenga
 * el contexto completo del usuario que disparó el error.
 *
 * @example
 *   import { Logger } from "@/utils/logger";
 *   void Logger.error("Failed to load customers", err, { action: "loadCustomers" });
 */
export class Logger {
  /**
   * Registra un error en `error_logs`. Fire-and-forget: nunca lanza.
   * Si el insert falla, hace fallback a `console.error` para evitar
   * recursión y mantener al usuario informado en dev.
   */
  static async error(
    message: string,
    error?: unknown,
    context?: Record<string, unknown>
  ): Promise<void> {
    const err =
      error instanceof Error
        ? error
        : error != null
        ? new Error(typeof error === "string" ? error : JSON.stringify(error))
        : null;

    console.error(`[ERROR] ${message}`, err ?? error);

    try {
      const supabase = createClient();

      // Enriquecer con user + organization (mismo patrón que ErrorBoundary)
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let organizationId: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();
        organizationId = profile?.organization_id ?? null;
      }

      const userAgent =
        typeof window !== "undefined" ? window.navigator.userAgent : null;
      const url =
        typeof window !== "undefined" ? window.location.href : null;

      await supabase.from("error_logs").insert({
        error_message: message,
        error_stack: err?.stack ?? null,
        user_agent: userAgent,
        url,
        context: (context as never) ?? null,
        user_id: user?.id ?? null,
        organization_id: organizationId,
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }
  }

  /**
   * Registra información en consola. No persiste en Supabase para no
   * inflar `error_logs` con ruido.
   */
  static info(message: string, data?: unknown) {
    console.info(`[INFO] ${message}`, data);
  }
}
