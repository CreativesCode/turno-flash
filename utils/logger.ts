import { createClient } from "@/utils/supabase/client";

export type LogLevel = "error" | "warn" | "info" | "debug";

interface LogContext {
  [key: string]: any;
}

interface ErrorLogOptions {
  level?: LogLevel;
  context?: LogContext;
  userFriendlyMessage?: string;
}

/**
 * Logger utility para registrar errores y eventos en Supabase
 * 
 * @example
 * ```ts
 * import { logger } from '@/utils/logger';
 * 
 * logger.error('Failed to load data', error, { userId: '123', action: 'loadCustomers' });
 * logger.info('User logged in', { userId: '123' });
 * ```
 */
class Logger {
  /**
   * Registra un error en Supabase
   */
  static async error(
    message: string,
    error?: Error,
    options?: ErrorLogOptions
  ): Promise<void> {
    const { context = {}, userFriendlyMessage } = options || {};

    // Siempre loggear en consola
    console.error(`[ERROR] ${message}`, error, context);

    // Log a Supabase (gratis, sin límites)
    try {
      const supabase = createClient();

      // Obtener información del usuario actual si está autenticado
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Obtener organización del usuario si existe
      let organizationId: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("organization_id")
          .eq("user_id", user.id)
          .single();

        organizationId = profile?.organization_id || null;
      }

      // Preparar contexto completo
      const fullContext = {
        ...context,
        userFriendlyMessage,
        timestamp: new Date().toISOString(),
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : null,
        url: typeof window !== "undefined" ? window.location.href : null,
        pathname: typeof window !== "undefined" ? window.location.pathname : null,
      };

      // Insertar error en Supabase
      await supabase.from("error_logs").insert({
        error_message: message,
        error_stack: error?.stack || null,
        component_stack: null, // Solo disponible en ErrorBoundary
        user_agent: fullContext.userAgent,
        url: fullContext.url,
        context: fullContext,
        user_id: user?.id || null,
        organization_id: organizationId,
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      // Fallback a console si falla el logging
      console.error("Failed to log error to Supabase:", logError);
    }
  }

  /**
   * Registra una advertencia
   */
  static warn(message: string, context?: LogContext): void {
    console.warn(`[WARN] ${message}`, context);
    // Opcional: También loggear warnings críticos a Supabase
    // this.error(message, undefined, { level: 'warn', context });
  }

  /**
   * Registra información
   */
  static info(message: string, context?: LogContext): void {
    console.info(`[INFO] ${message}`, context);
    // No loggear info a Supabase para evitar spam
    // Solo errores van a la base de datos
  }

  /**
   * Registra información de debug (solo en desarrollo)
   */
  static debug(message: string, context?: LogContext): void {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[DEBUG] ${message}`, context);
    }
  }

  /**
   * Helper para loggear errores de API
   */
  static async apiError(
    endpoint: string,
    error: Error,
    requestData?: any
  ): Promise<void> {
    await this.error(`API Error: ${endpoint}`, error, {
      context: {
        endpoint,
        requestData,
        type: "api_error",
      },
    });
  }

  /**
   * Helper para loggear errores de validación
   */
  static async validationError(
    field: string,
    value: any,
    rule: string
  ): Promise<void> {
    await this.error(`Validation Error: ${field}`, undefined, {
      context: {
        field,
        value,
        rule,
        type: "validation_error",
      },
      userFriendlyMessage: `Error de validación en el campo ${field}`,
    });
  }

  /**
   * Helper para loggear errores de permisos
   */
  static async permissionError(
    action: string,
    resource: string,
    userId?: string
  ): Promise<void> {
    await this.error(`Permission Error: ${action} on ${resource}`, undefined, {
      context: {
        action,
        resource,
        userId,
        type: "permission_error",
      },
      userFriendlyMessage: "No tienes permisos para realizar esta acción",
    });
  }
}

// Exportar instancia singleton
export const logger = Logger;

// Exportar también como default para compatibilidad
export default Logger;
