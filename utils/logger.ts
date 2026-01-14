import { createClient } from "@/utils/supabase/client";

/**
 * Logger utility para registrar errores y eventos en Supabase
 * 
 * @example
 * ```ts
 * import { Logger } from '@/utils/logger';
 * 
 * Logger.error('Failed to load data', error, { userId: '123', action: 'loadCustomers' });
 * Logger.info('User logged in', { userId: '123' });
 * ```
 */
export class Logger {
  /**
   * Registra un error en Supabase
   */
  static async error(
    message: string,
    error?: Error,
    context?: Record<string, any>
  ) {
    console.error(`[ERROR] ${message}`, error);

    // Log a Supabase (gratis, sin límites)
    try {
      const supabase = createClient();
      await supabase.from("error_logs").insert({
        error_message: message,
        error_stack: error?.stack,
        context: context ? JSON.stringify(context) : null,
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    // Alternativa: Enviar a GlitchTip/Rollbar/Bugsnag si prefieres servicio externo
    // if (typeof window !== "undefined" && window.Sentry) {
    //   window.Sentry.captureException(error || new Error(message));
    // }
  }

  /**
   * Registra información
   */
  static info(message: string, data?: any) {
    console.info(`[INFO] ${message}`, data);
    // Opcional: Log a Supabase también para info crítico
  }
}
