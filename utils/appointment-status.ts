/**
 * Structured metadata for appointment statuses, used by the redesigned UI:
 *  - StatusBadge reads `label` to render the visible text.
 *  - The CSS class `st-{key}` (defined in globals.css) provides the colors via
 *    --st-c / --st-cb / --st-bg, so this module never returns Tailwind classes.
 *  - NEXT_ACTIONS is the single source of truth for "what's the next button to
 *    show on this appointment?" — replaces ad-hoc conditionals scattered across
 *    appointment pages.
 *
 * Note: the legacy helpers in `config/constants.ts` (STATUS_LABELS,
 * getStatusBadgeColor, …) stay around for screens not yet migrated.
 */

import type { AppointmentStatus } from "@/types/appointments";

export interface StatusMeta {
  key: AppointmentStatus;
  label: string;
  /** Compact label for narrow contexts (chips on small screens). */
  short: string;
}

export const STATUSES: readonly StatusMeta[] = [
  { key: "pending", label: "Pendiente", short: "Pend." },
  { key: "confirmed", label: "Confirmado", short: "Conf." },
  { key: "reminded", label: "Recordatorio enviado", short: "Record." },
  { key: "client_confirmed", label: "Cliente confirmó", short: "Cliente OK" },
  { key: "checked_in", label: "Check-in", short: "Check-in" },
  { key: "in_progress", label: "En curso", short: "En curso" },
  { key: "completed", label: "Completado", short: "Listo" },
  { key: "cancelled", label: "Cancelado", short: "Cancel." },
  { key: "no_show", label: "No asistió", short: "No vino" },
  { key: "rescheduled", label: "Reagendado", short: "Reagend." },
] as const;

const STATUS_INDEX: Record<AppointmentStatus, StatusMeta> = STATUSES.reduce(
  (acc, s) => {
    acc[s.key] = s;
    return acc;
  },
  {} as Record<AppointmentStatus, StatusMeta>
);

export function getStatusMeta(key: AppointmentStatus): StatusMeta {
  return STATUS_INDEX[key];
}

/**
 * The next status the user should typically advance to from each state.
 * `null` means the appointment is in a terminal state and shows no advance CTA.
 * Skipping intermediate states is still allowed elsewhere — this is just the
 * "happy path" forward action surfaced on the card / detail modal.
 */
export interface NextAction {
  /** Verb shown on the button, e.g. "Confirmar". */
  label: string;
  /** Status key the appointment will transition to. */
  to: AppointmentStatus;
}

export const NEXT_ACTIONS: Record<AppointmentStatus, NextAction | null> = {
  pending: { label: "Confirmar", to: "confirmed" },
  confirmed: { label: "Enviar recordatorio", to: "reminded" },
  reminded: { label: "Marcar confirmado por cliente", to: "client_confirmed" },
  client_confirmed: { label: "Hacer check-in", to: "checked_in" },
  checked_in: { label: "Empezar", to: "in_progress" },
  in_progress: { label: "Completar", to: "completed" },
  completed: null,
  cancelled: null,
  no_show: null,
  rescheduled: null,
};
