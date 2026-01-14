import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/utils/supabase/client";

export interface ErrorLog {
  id: string;
  error_message: string;
  error_stack: string | null;
  component_stack: string | null;
  user_agent: string | null;
  url: string | null;
  context: Record<string, any> | null;
  user_id: string | null;
  organization_id: string | null;
  timestamp: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
  error_count: number;
  last_occurrence: string;
}

export interface ErrorLogsQueryParams {
  resolved?: boolean;
  days?: number;
  limit?: number;
  search?: string;
}

/**
 * Hook para obtener logs de errores
 */
export function useErrorLogsQuery(params: ErrorLogsQueryParams = {}) {
  const {
    resolved,
    days = 7,
    limit = 50,
    search,
  } = params;

  return useQuery({
    queryKey: ["error_logs", resolved, days, limit, search],
    queryFn: async () => {
      const supabase = createClient();

      // Construir query
      let query = supabase
        .from("error_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(limit);

      // Filtrar por resuelto/no resuelto
      if (resolved !== undefined) {
        query = query.eq("resolved", resolved);
      }

      // Filtrar por días
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - days);
      query = query.gte("timestamp", daysAgo.toISOString());

      // Búsqueda por mensaje de error
      if (search) {
        query = query.ilike("error_message", `%${search}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Error loading error logs: ${error.message}`);
      }

      return (data || []) as ErrorLog[];
    },
    staleTime: 30000, // 30 segundos
  });
}

/**
 * Hook para obtener estadísticas de errores
 */
export function useErrorStatsQuery(days: number = 7) {
  return useQuery({
    queryKey: ["error_stats", days],
    queryFn: async () => {
      const supabase = createClient();

      const { data, error } = await supabase.rpc("get_error_stats", {
        p_organization_id: null, // null = todas las organizaciones
        p_days: days,
      });

      if (error) {
        throw new Error(`Error loading error stats: ${error.message}`);
      }

      return data?.[0] || {
        total_errors: 0,
        unresolved_errors: 0,
        resolved_errors: 0,
        unique_errors: 0,
        most_common_error: null,
        errors_today: 0,
      };
    },
    staleTime: 60000, // 1 minuto
  });
}

/**
 * Hook para marcar un error como resuelto
 */
export function useResolveError() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      errorId,
      resolutionNotes,
    }: {
      errorId: string;
      resolutionNotes?: string;
    }) => {
      const supabase = createClient();

      // Obtener usuario actual
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase
        .from("error_logs")
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id || null,
          resolution_notes: resolutionNotes || null,
        })
        .eq("id", errorId);

      if (error) {
        throw new Error(`Error resolving error log: ${error.message}`);
      }
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["error_logs"] });
      queryClient.invalidateQueries({ queryKey: ["error_stats"] });
    },
  });
}

/**
 * Hook para marcar un error como no resuelto
 */
export function useUnresolveError() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (errorId: string) => {
      const supabase = createClient();

      const { error } = await supabase
        .from("error_logs")
        .update({
          resolved: false,
          resolved_at: null,
          resolved_by: null,
          resolution_notes: null,
        })
        .eq("id", errorId);

      if (error) {
        throw new Error(`Error unresolving error log: ${error.message}`);
      }
    },
    onSuccess: () => {
      // Invalidar queries relacionadas
      queryClient.invalidateQueries({ queryKey: ["error_logs"] });
      queryClient.invalidateQueries({ queryKey: ["error_stats"] });
    },
  });
}
