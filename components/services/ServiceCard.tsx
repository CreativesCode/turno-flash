"use client";

import { ListRow, Switch } from "@/components/ui";
import type { Service } from "@/types/appointments";
import { fmtDuration, fmtMoney } from "@/utils/format";

export interface ServiceCardProps {
  service: Service;
  canManage: boolean;
  onEdit: (s: Service) => void;
  onToggleActive: (s: Service) => void;
}

/** One service as a row of a ListGroup: tapping it opens the edit form. */
export function ServiceCard({
  service,
  canManage,
  onEdit,
  onToggleActive,
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
      title={service.name}
      titleAside={
        <span className="font-mono text-body font-medium tabular-nums text-foreground">
          {service.price != null
            ? fmtMoney(service.price, undefined, service.currency ?? undefined)
            : "—"}
        </span>
      }
      subtitle={details.join(" · ")}
      trailing={
        canManage && (
          <Switch
            checked={isActive}
            onChange={() => onToggleActive(service)}
            label={`${service.name}: disponible`}
          />
        )
      }
      dimmed={!isActive}
      onClick={canManage ? () => onEdit(service) : undefined}
    />
  );
}
