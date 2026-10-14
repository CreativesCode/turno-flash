"use client";

import { ListRow, Switch } from "@/components/ui";
import type { Service } from "@/types/appointments";
import { fmtDuration, fmtMoney } from "@/utils/format";
import { ArrowDown, ArrowUp } from "lucide-react";
import { ServiceBadge } from "./ServiceBadge";

export interface ServiceCardProps {
  service: Service;
  canManage: boolean;
  onEdit: (s: Service) => void;
  onToggleActive: (s: Service) => void;
  /** Shows the up/down arrows instead of the switch */
  ordering?: boolean;
  /** Moves the service inside its group; absent at the edges */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const moveButton =
  "flex size-10 cursor-pointer items-center justify-center rounded-control text-foreground-muted transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30";

/** One service as a row of a ListGroup: tapping it opens the edit form. */
export function ServiceCard({
  service,
  canManage,
  onEdit,
  onToggleActive,
  ordering = false,
  onMoveUp,
  onMoveDown,
}: ServiceCardProps) {
  const color = service.color ?? "#3b82f6";
  const isActive = service.is_active ?? false;

  const details = [
    fmtDuration(service.duration_minutes),
    service.buffer_time_minutes
      ? `+${service.buffer_time_minutes}m buffer`
      : null,
    service.available_for_online_booking ? "Reserva online" : null,
    service.requires_approval ? "Requiere aprobación" : null,
    isActive ? null : "Pausado",
  ].filter(Boolean);

  const trailing = ordering ? (
    <div className="flex items-center">
      <button
        type="button"
        className={moveButton}
        onClick={onMoveUp}
        disabled={!onMoveUp}
        aria-label={`Subir ${service.name}`}
      >
        <ArrowUp className="size-5" />
      </button>
      <button
        type="button"
        className={moveButton}
        onClick={onMoveDown}
        disabled={!onMoveDown}
        aria-label={`Bajar ${service.name}`}
      >
        <ArrowDown className="size-5" />
      </button>
    </div>
  ) : (
    canManage && (
      <Switch
        checked={isActive}
        onChange={() => onToggleActive(service)}
        label={`${service.name}: disponible`}
      />
    )
  );

  return (
    <ListRow
      leading={
        <span
          aria-hidden
          className="flex size-[42px] shrink-0 items-center justify-center rounded-[13px]"
          style={{
            background: `color-mix(in srgb, ${color} 13%, transparent)`,
          }}
        >
          <span
            className="size-3 rounded-[4px]"
            style={{ background: color }}
          />
        </span>
      }
      // Up to two lines: "Álbum personalizado 6x8" vs "8x10" must stay readable
      title={
        <span className="line-clamp-2 whitespace-normal">{service.name}</span>
      }
      // The price goes on the details line so the name gets the full width
      subtitle={
        <>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {service.price != null
              ? fmtMoney(service.price, undefined, service.currency ?? undefined)
              : "—"}
          </span>
          {` · ${details.join(" · ")}`}
        </>
      }
      trailing={trailing}
      dimmed={!isActive}
      onClick={canManage && !ordering ? () => onEdit(service) : undefined}
    >
      {service.badge && <ServiceBadge badge={service.badge} className="mt-1.5" />}
    </ListRow>
  );
}
