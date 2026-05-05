"use client";

import { Card, StatusBadge } from "@/components/ui";
import type { AppointmentWithDetails } from "@/types/appointments";
import { NEXT_ACTIONS } from "@/utils/appointment-status";
import { fmtDuration } from "@/utils/format";
import { ChevronRight } from "lucide-react";

interface ApptRowProps {
  appointment: AppointmentWithDetails;
  /** Optional click on the row (open detail modal). */
  onOpen?: (a: AppointmentWithDetails) => void;
  /** Optional next-action handler — when provided, renders a small CTA pill that
   * advances the appointment status using NEXT_ACTIONS. Pass `null` or omit to
   * hide the CTA (e.g. on the dashboard "next up" preview).
   */
  onAdvance?: (a: AppointmentWithDetails, nextStatus: string) => void;
  /** Optional service color (hex). Renders a small dot before the service name. */
  serviceColor?: string | null;
  /** Optional staff color (hex). Renders a small dot before the staff nickname. */
  staffColor?: string | null;
}

function formatTime(time: string | null): string {
  if (!time) return "—";
  // Strip seconds if present (HH:MM:SS → HH:MM)
  return time.length > 5 ? time.slice(0, 5) : time;
}

function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim() || "Sin nombre";
}

export function ApptRow({
  appointment: a,
  onOpen,
  onAdvance,
  serviceColor,
  staffColor,
}: ApptRowProps) {
  const status = a.status ?? "pending";
  const next = NEXT_ACTIONS[status];
  const time = formatTime(a.start_time);
  const customer = fullName(a.customer_first_name, a.customer_last_name);
  const staff =
    a.staff_nickname ||
    (a.staff_first_name
      ? fullName(a.staff_first_name, a.staff_last_name ?? "")
      : null);

  return (
    <Card
      className={`st-${status} relative flex gap-3 overflow-hidden p-3`}
      onClick={onOpen ? () => onOpen(a) : undefined}
      role={onOpen ? "button" : undefined}
      style={onOpen ? { cursor: "pointer" } : undefined}
    >
      {/* Left status accent bar */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: "var(--st-c)" }}
      />

      {/* Time block */}
      <div className="flex min-w-[3.25rem] flex-col items-center justify-center pl-2">
        <div className="text-base font-extrabold tracking-tight tabular-nums text-foreground">
          {time}
        </div>
        <div className="text-[10px] text-foreground-muted">
          {fmtDuration(a.duration_minutes)}
        </div>
      </div>

      <div className="w-px self-stretch bg-border" aria-hidden />

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-foreground">
          {customer}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-foreground-muted">
          {serviceColor && (
            <span
              aria-hidden
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: serviceColor }}
            />
          )}
          <span className="truncate">{a.service_name}</span>
          {staff && (
            <>
              <span aria-hidden>·</span>
              {staffColor && (
                <span
                  aria-hidden
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: staffColor }}
                />
              )}
              <span className="truncate">{staff}</span>
            </>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={status} size="sm" />
          {next && onAdvance && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAdvance(a, next.to);
              }}
              className="inline-flex items-center gap-0.5 rounded-full border border-primary-600 bg-primary-50 px-2.5 py-0.5 text-[11px] font-bold text-primary-500 transition-colors hover:bg-primary-100 dark:border-primary-300 dark:bg-primary-900/20 dark:text-primary-200 dark:hover:bg-primary-900/40"
            >
              {next.label}
              <ChevronRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
