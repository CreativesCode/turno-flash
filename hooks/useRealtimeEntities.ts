"use client";

import { useAuth } from "@/contexts/auth-context";
import { appointmentKeys } from "./useAppointments.query";
import { customerKeys } from "./useCustomers.query";
import { serviceKeys } from "./useServices.query";
import { staffKeys } from "./useStaff.query";
import { useRealtimeTable } from "./useRealtimeTable";

/**
 * Query key namespace para WhatsApp outbound messages.
 * No hay un hook React Query dedicado todavía; se expone para que
 * cualquier consumer pueda invalidar/observar este key set vía RQ
 * o, en componentes legacy, suscribirse vía `useRealtimeWAOutbound`
 * con un callback `onEvent`.
 */
export const waOutboundKeys = {
  all: ["wa_outbound_messages"] as const,
  lists: () => [...waOutboundKeys.all, "list"] as const,
  list: (orgId: string) => [...waOutboundKeys.lists(), { orgId }] as const,
} as const;

/* ─────────────────────────────────────────────────────────────────
 * Hooks por entidad
 * ─────────────────────────────────────────────────────────────── */

export function useRealtimeAppointments(enabled = true) {
  const { profile } = useAuth();
  useRealtimeTable({
    table: "appointments",
    organizationId: profile?.organization_id ?? null,
    invalidateKeys: [appointmentKeys.all],
    enabled,
  });
}

export function useRealtimeCustomers(enabled = true) {
  const { profile } = useAuth();
  useRealtimeTable({
    table: "customers",
    organizationId: profile?.organization_id ?? null,
    invalidateKeys: [customerKeys.all],
    enabled,
  });
}

export function useRealtimeServices(enabled = true) {
  const { profile } = useAuth();
  useRealtimeTable({
    table: "services",
    organizationId: profile?.organization_id ?? null,
    invalidateKeys: [serviceKeys.all],
    enabled,
  });
}

export function useRealtimeStaff(enabled = true) {
  const { profile } = useAuth();
  useRealtimeTable({
    table: "staff_members",
    organizationId: profile?.organization_id ?? null,
    invalidateKeys: [staffKeys.all],
    enabled,
  });
}

/**
 * Realtime de wa_outbound_messages. Invalida queryKey de RQ y permite
 * a consumers no-RQ (p.ej. WhatsAppOrgSection) pasar `onChange` para
 * refrescar su estado local.
 */
export function useRealtimeWAOutbound(options?: {
  enabled?: boolean;
  onChange?: () => void;
}) {
  const { profile } = useAuth();
  useRealtimeTable({
    table: "wa_outbound_messages",
    organizationId: profile?.organization_id ?? null,
    invalidateKeys: [waOutboundKeys.all],
    enabled: options?.enabled ?? true,
    onEvent: options?.onChange ? () => options.onChange?.() : undefined,
  });
}

/**
 * Mount-once helper para suscribir realtime a TODAS las entidades core
 * operativas. Pensado para usarse en el layout del dashboard, así
 * cualquier página dentro del dashboard recibe actualizaciones en vivo.
 */
export function useRealtimeAll(enabled = true) {
  useRealtimeAppointments(enabled);
  useRealtimeCustomers(enabled);
  useRealtimeServices(enabled);
  useRealtimeStaff(enabled);
  useRealtimeWAOutbound({ enabled });
}
