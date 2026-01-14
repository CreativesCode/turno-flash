"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary para capturar errores de React y registrarlos en Supabase
 * 
 * @example
 * ```tsx
 * <ErrorBoundary>
 *   <App />
 * </ErrorBoundary>
 * ```
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  async componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Guardar errorInfo en el estado para mostrarlo en desarrollo
    this.setState({ errorInfo });

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

      // Preparar contexto adicional
      const context = {
        componentStack: errorInfo.componentStack,
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : null,
        url: typeof window !== "undefined" ? window.location.href : null,
        pathname: typeof window !== "undefined" ? window.location.pathname : null,
        timestamp: new Date().toISOString(),
      };

      // Insertar error en Supabase
      await supabase.from("error_logs").insert({
        error_message: error.message,
        error_stack: error.stack || null,
        component_stack: errorInfo.componentStack || null,
        user_agent: context.userAgent,
        url: context.url,
        context: context,
        user_id: user?.id || null,
        organization_id: organizationId,
        timestamp: new Date().toISOString(),
      });
    } catch (logError) {
      // Fallback a console si falla el logging
      console.error("Error logging failed:", logError);
      console.error("Original error:", error, errorInfo);
    }

    // Llamar callback personalizado si existe
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Renderizar componente de fallback por defecto
      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
  onReload: () => void;
}

/**
 * Componente de fallback que se muestra cuando ocurre un error
 */
function ErrorFallback({
  error,
  errorInfo,
  onReset,
  onReload,
}: ErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Algo salió mal
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Hemos registrado el error y lo revisaremos pronto. Por favor, intenta
            recargar la página.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
          <Button onClick={onReload} variant="primary" className="w-full sm:w-auto">
            🔄 Recargar página
          </Button>
          <Button
            onClick={onReset}
            variant="secondary"
            className="w-full sm:w-auto"
          >
            Intentar de nuevo
          </Button>
        </div>

        {isDevelopment && error && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
            <h3 className="text-sm font-semibold text-red-900 dark:text-red-200 mb-2">
              Detalles del error (solo en desarrollo):
            </h3>
            <pre className="text-xs text-red-800 dark:text-red-300 overflow-auto max-h-64">
              <div className="mb-2">
                <strong>Mensaje:</strong> {error.message}
              </div>
              {error.stack && (
                <div className="mb-2">
                  <strong>Stack:</strong>
                  <pre className="mt-1 whitespace-pre-wrap">{error.stack}</pre>
                </div>
              )}
              {errorInfo?.componentStack && (
                <div>
                  <strong>Component Stack:</strong>
                  <pre className="mt-1 whitespace-pre-wrap text-xs">
                    {errorInfo.componentStack}
                  </pre>
                </div>
              )}
            </pre>
          </div>
        )}

        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>
            Si el problema persiste, contacta al soporte técnico con el código de
            error: <code className="font-mono">{error?.name || "UNKNOWN"}</code>
          </p>
        </div>
      </div>
    </div>
  );
}
