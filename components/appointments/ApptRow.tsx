"use client";

import { ListRow, StatusBadge, TimeBlock } from "@/components/ui";
import type { AppointmentWithDetails } from "@/types/appointments";
import { depositOpen } from "@/utils/deposit";
import { fmtDuration } from "@/utils/format";

interface ApptRowProps {
  appointment: AppointmentWithDetails;
  /** Optional click on the row (open detail modal). */
  onOpen?: (a: AppointmentWithDetails) => void;
  /** Optional service color (hex). Renders a small dot before the service name. */
  serviceColor?: string | null;
}

export function formatTime(time: string | null): string {
  if (!time) return "—";
  // Strip seconds if present (HH:MM:SS → HH:MM)
  return time.length > 5 ? time.slice(0, 5) : time;
}

function fullName(first: string, last: string): string {
  return `${first} ${last}`.trim() || "Sin nombre";
}

const DONE: readonly string[] = ["completed", "cancelled", "no_show"];

/** One appointment as a row of a ListGroup. Advancing it happens in the detail. */
export function ApptRow({ appointment: a, onOpen, serviceColor }: ApptRowProps) {
  const status = a.status ?? "pending";
  const staff =
    a.staff_nickname ||
    (a.staff_first_name
      ? fullName(a.staff_first_name, a.staff_last_name ?? "")
      : null);

  return (
    <ListRow
      leading={
        <TimeBlock
          time={formatTime(a.start_time)}
          detail={fmtDuration(a.duration_minutes)}
        />
      }
      title={fullName(a.customer_first_name, a.customer_last_name)}
      // Same number the WhatsApp messages show, to match them at a glance
      titleAside={
        a.appointment_number && (
          // On a phone the name needs the room
          <span className="font-mono text-caption tabular-nums text-foreground-subtle max-sm:hidden">
            N° {a.appointment_number}
          </span>
        )
      }
      subtitle={[
        a.service_name,
        staff,
        // Still waiting for the deposit: it is what confirms the appointment
        !DONE.includes(status) && depositOpen(a.deposit_status)
          ? "Falta anticipo"
          : null,
      ]
        .filter(Boolean)
        .join(" · ")}
      subtitleDot={serviceColor ?? undefined}
      trailing={<StatusBadge status={status} />}
      dimmed={DONE.includes(status)}
      onClick={onOpen ? () => onOpen(a) : undefined}
    />
  );
}
