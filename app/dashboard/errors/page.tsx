"use client";

import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import {
  useErrorLogsQuery,
  useErrorStatsQuery,
  useResolveError,
  useUnresolveError,
  useToast,
} from "@/hooks";
import { AlertCircle, CheckCircle, Clock, Search, XCircle } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

export default function ErrorsPage() {
  const { profile } = useAuth();
  const toast = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [resolvedFilter, setResolvedFilter] = useState<boolean | undefined>(
    undefined
  );
  const [daysFilter, setDaysFilter] = useState(7);

  // Verificar permisos (solo admin y owner)
  const canViewErrors =
    profile?.role === "admin" || profile?.role === "owner";

  // Queries
  const {
    data: errorLogs = [],
    isLoading,
    error,
  } = useErrorLogsQuery({
    resolved: resolvedFilter,
    days: daysFilter,
    search: searchTerm || undefined,
    limit: 100,
  });

  const { data: stats } = useErrorStatsQuery(daysFilter);

  const resolveMutation = useResolveError();
  const unresolveMutation = useUnresolveError();

  // Handlers
  const handleResolve = async (errorId: string) => {
    try {
      await resolveMutation.mutateAsync({
        errorId,
        resolutionNotes: "Resuelto manualmente",
      });
      toast.success("Error marcado como resuelto");
    } catch (err) {
      toast.error(
        "Error",
        err instanceof Error ? err.message : "No se pudo resolver el error"
      );
    }
  };

  const handleUnresolve = async (errorId: string) => {
    try {
      await unresolveMutation.mutateAsync(errorId);
      toast.success("Error marcado como no resuelto");
    } catch (err) {
      toast.error(
        "Error",
        err instanceof Error ? err.message : "No se pudo actualizar el error"
      );
    }
  };

  if (!canViewErrors) {
    return (
      <ProtectedRoute>
        <PageMetadata
          title="Errores"
          description="Logs de errores de la aplicación"
        />
        <div className="p-8 text-center">
          <p className="text-foreground-muted">
            No tienes permisos para ver esta página.
          </p>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Logs de Errores"
        description="Monitoreo y gestión de errores de la aplicación"
      />
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">
              Logs de Errores
            </h1>
            <p className="mt-2 text-foreground-muted">
              Monitorea y gestiona los errores de la aplicación
            </p>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground-muted">
                      Total Errores
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {stats.total_errors || 0}
                    </p>
                  </div>
                  <AlertCircle className="h-8 w-8 text-danger" />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground-muted">
                      Sin Resolver
                    </p>
                    <p className="mt-1 text-2xl font-bold text-danger">
                      {stats.unresolved_errors || 0}
                    </p>
                  </div>
                  <XCircle className="h-8 w-8 text-danger" />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground-muted">
                      Resueltos
                    </p>
                    <p className="mt-1 text-2xl font-bold text-success">
                      {stats.resolved_errors || 0}
                    </p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-success" />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground-muted">
                      Hoy
                    </p>
                    <p className="mt-1 text-2xl font-bold text-foreground">
                      {stats.errors_today || 0}
                    </p>
                  </div>
                  <Clock className="h-8 w-8 text-info" />
                </div>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-foreground-muted" />
                <input
                  type="text"
                  placeholder="Buscar por mensaje de error..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-10 py-2 text-foreground placeholder:text-foreground-muted focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <select
                value={resolvedFilter === undefined ? "all" : resolvedFilter ? "resolved" : "unresolved"}
                onChange={(e) => {
                  const value = e.target.value;
                  setResolvedFilter(
                    value === "all" ? undefined : value === "resolved"
                  );
                }}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="all">Todos</option>
                <option value="unresolved">Sin Resolver</option>
                <option value="resolved">Resueltos</option>
              </select>

              <select
                value={daysFilter}
                onChange={(e) => setDaysFilter(Number(e.target.value))}
                className="rounded-lg border border-border bg-surface px-4 py-2 text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value={1}>Últimas 24 horas</option>
                <option value={7}>Últimos 7 días</option>
                <option value={30}>Últimos 30 días</option>
                <option value={90}>Últimos 90 días</option>
              </select>
            </div>
          </div>

          {/* Error List */}
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-foreground-muted">Cargando errores...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg border border-danger bg-danger-50 dark:bg-danger-900/20 p-4 text-danger">
              Error al cargar errores: {error instanceof Error ? error.message : "Error desconocido"}
            </div>
          ) : errorLogs.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-12 text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-success mb-4" />
              <p className="text-lg font-medium text-foreground">
                No se encontraron errores
              </p>
              <p className="mt-2 text-foreground-muted">
                {resolvedFilter === false
                  ? "¡Excelente! No hay errores sin resolver."
                  : "No hay errores en el período seleccionado."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {errorLogs.map((errorLog) => (
                <div
                  key={errorLog.id}
                  className={`rounded-lg border ${
                    errorLog.resolved
                      ? "border-success bg-success-50 dark:bg-success-900/20"
                      : "border-danger bg-danger-50 dark:bg-danger-900/20"
                  } p-4`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {errorLog.resolved ? (
                          <CheckCircle className="h-5 w-5 text-success" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-danger" />
                        )}
                        <h3 className="font-semibold text-foreground">
                          {errorLog.error_message}
                        </h3>
                        {errorLog.error_count > 1 && (
                          <span className="rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground">
                            {errorLog.error_count}x
                          </span>
                        )}
                      </div>

                      {errorLog.url && (
                        <p className="text-sm text-foreground-muted mb-1">
                          <span className="font-medium">URL:</span> {errorLog.url}
                        </p>
                      )}

                      <p className="text-sm text-foreground-muted mb-2">
                        <span className="font-medium">Última ocurrencia:</span>{" "}
                        {formatDistanceToNow(new Date(errorLog.last_occurrence), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </p>

                      {errorLog.error_stack && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium text-foreground-muted hover:text-foreground">
                            Ver stack trace
                          </summary>
                          <pre className="mt-2 overflow-auto rounded bg-muted p-3 text-xs text-foreground">
                            {errorLog.error_stack}
                          </pre>
                        </details>
                      )}

                      {errorLog.context && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium text-foreground-muted hover:text-foreground">
                            Ver contexto
                          </summary>
                          <pre className="mt-2 overflow-auto rounded bg-muted p-3 text-xs text-foreground">
                            {JSON.stringify(errorLog.context, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>

                    <div className="ml-4 flex flex-col gap-2">
                      {errorLog.resolved ? (
                        <button
                          onClick={() => handleUnresolve(errorLog.id)}
                          disabled={unresolveMutation.isPending}
                          className="rounded px-3 py-1 text-sm font-medium text-success hover:bg-success-100 dark:hover:bg-success-900/40"
                        >
                          {unresolveMutation.isPending ? "..." : "Marcar sin resolver"}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleResolve(errorLog.id)}
                          disabled={resolveMutation.isPending}
                          className="rounded px-3 py-1 text-sm font-medium text-success hover:bg-success-100 dark:hover:bg-success-900/40"
                        >
                          {resolveMutation.isPending ? "..." : "Marcar resuelto"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
