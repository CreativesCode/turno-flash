"use client";

import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { QueryKey, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface UseRealtimeTableOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Nombre de la tabla en `public` schema */
  table: string;
  /** organization_id del usuario actual; si no existe, la suscripción no se monta */
  organizationId: string | null | undefined;
  /** Query keys de React Query a invalidar cuando llega un evento */
  invalidateKeys: QueryKey[];
  /** Eventos a escuchar. Default: '*' (INSERT/UPDATE/DELETE) */
  event?: RealtimeEvent;
  /** Habilitar/deshabilitar la suscripción */
  enabled?: boolean;
  /**
   * Filtro adicional opcional (formato Supabase, p.ej. "status=eq.pending").
   * Se combina con el filtro por organization_id usando AND lógico,
   * pero Supabase Realtime sólo soporta UN filtro por canal; si lo usás,
   * dejá `organizationId` aparte y validá en `onEvent`.
   */
  filter?: string;
  /** Callback opcional para reaccionar a cada evento (logs, toasts, patch manual) */
  onEvent?: (payload: RealtimePostgresChangesPayload<T>) => void;
}

/**
 * Hook genérico que se suscribe a postgres_changes de una tabla y, en cada
 * evento INSERT/UPDATE/DELETE, invalida los query keys de React Query
 * pasados en `invalidateKeys`.
 *
 * Comportamiento:
 *   - Filtra por `organization_id=eq.<organizationId>` por defecto.
 *   - Si Supabase Realtime no entrega organization_id en el payload (DELETE
 *     sin REPLICA IDENTITY FULL), el filtro server-side igual aplica.
 *   - Limpia el canal al desmontar o al cambiar organizationId.
 */
export function useRealtimeTable<T extends Record<string, unknown> = Record<string, unknown>>(
  options: UseRealtimeTableOptions<T>
) {
  const {
    table,
    organizationId,
    invalidateKeys,
    event = "*",
    enabled = true,
    filter,
    onEvent,
  } = options;

  const queryClient = useQueryClient();
  const supabase = useMemo(() => createClient(), []);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Mantener refs estables para callbacks/keys, evitando re-suscripciones
  // por nuevas referencias en cada render.
  const onEventRef = useRef(onEvent);
  const invalidateKeysRef = useRef(invalidateKeys);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    invalidateKeysRef.current = invalidateKeys;
  }, [invalidateKeys]);

  useEffect(() => {
    if (!enabled || !organizationId) return;

    const effectiveFilter = filter ?? `organization_id=eq.${organizationId}`;
    const channelName = `rt:${table}:${organizationId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        // @ts-expect-error postgres_changes typings son laxas en supabase-js
        "postgres_changes",
        {
          event,
          schema: "public",
          table,
          filter: effectiveFilter,
        },
        (payload: RealtimePostgresChangesPayload<T>) => {
          // Invalidar todos los query keys configurados
          for (const key of invalidateKeysRef.current) {
            queryClient.invalidateQueries({ queryKey: key });
          }
          onEventRef.current?.(payload);
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // Re-suscribir sólo si cambian estos valores. invalidateKeys/onEvent
    // se leen de refs para no causar re-suscripciones innecesarias.
  }, [enabled, organizationId, table, event, filter, supabase, queryClient]);
}
