"use client";

import { Card } from "@/components/ui";
import type { Service } from "@/types/appointments";
import { fmtDuration, fmtMoney } from "@/utils/format";
import { Clock, Edit3, Scissors } from "lucide-react";

export interface ServiceCardProps {
  service: Service;
  canManage: boolean;
  onEdit: (s: Service) => void;
  onToggleActive: (s: Service) => void;
}

export function ServiceCard({
  service,
  canManage,
  onEdit,
  onToggleActive,
}: ServiceCardProps) {
  const color = service.color ?? "#3b82f6";
  const isActive = service.is_active ?? false;

  return (
    <Card className="relative flex flex-col gap-3 overflow-hidden p-4">
      {/* top color bar */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: color }}
      />

      <div className="flex items-start gap-3">
        <div
          aria-hidden
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
          style={{
            background: color,
            boxShadow: `0 4px 12px -4px ${color}55`,
          }}
        >
          <Scissors className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="truncate text-sm font-bold text-foreground">
              {service.name}
            </h3>
            <div className="whitespace-nowrap text-base font-extrabold tracking-tight text-foreground">
              {service.price != null ? fmtMoney(service.price) : "—"}
            </div>
          </div>

          {service.description && (
            <p className="mt-1 line-clamp-2 text-xs text-foreground-muted">
              {service.description}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-foreground-muted">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {fmtDuration(service.duration_minutes)}
            </span>
            {service.buffer_time_minutes ? (
              <span>+{service.buffer_time_minutes}m buffer</span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap gap-1.5">
            {service.available_for_online_booking && (
              <span className="rounded-full border border-info-600 bg-info-50 px-2 py-0.5 text-[11px] font-bold text-info-600 dark:border-info-400 dark:bg-info-900/20 dark:text-info-300">
                Reserva online
              </span>
            )}
            {service.requires_approval && (
              <span className="rounded-full border border-warning-600 bg-warning-50 px-2 py-0.5 text-[11px] font-bold text-warning-600 dark:border-warning-400 dark:bg-warning-900/20 dark:text-warning-300">
                Requiere aprobación
              </span>
            )}
            {!isActive && (
              <span className="rounded-full border border-danger-600 bg-danger-50 px-2 py-0.5 text-[11px] font-bold text-danger-600 dark:border-danger-400 dark:bg-danger-900/20 dark:text-danger-300">
                Pausado
              </span>
            )}
          </div>
        </div>
      </div>

      {canManage && (
        <div className="flex items-center justify-between border-t border-border pt-3">
          <button
            type="button"
            onClick={() => onToggleActive(service)}
            className="flex items-center gap-2"
            aria-label={isActive ? "Pausar servicio" : "Activar servicio"}
          >
            <span
              aria-hidden
              className={`relative inline-flex h-[18px] w-8 items-center rounded-full p-0.5 transition-colors ${isActive ? "bg-primary-500" : "bg-border-2"
                }`}
            >
              <span
                className={`block h-3.5 w-3.5 rounded-full bg-white shadow-xs transition-transform ${isActive ? "translate-x-3.5" : "translate-x-0"
                  }`}
              />
            </span>
            <span
              className={`text-xs font-semibold ${isActive
                ? "text-primary-700 dark:text-primary-400"
                : "text-foreground-muted"
                }`}
            >
              {isActive ? "Activo" : "Pausado"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onEdit(service)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Edit3 className="h-3.5 w-3.5" />
            Editar
          </button>
        </div>
      )}
    </Card>
  );
}
