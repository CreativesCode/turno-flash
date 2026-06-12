"use client";

import { Card } from "@/components/ui";
import type { HeatmapCell } from "@/types/analytics";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { useMemo } from "react";

/**
 * Widgets de los dashboards de analítica que no usan recharts
 * (KPI cards con delta y heatmap de horas pico).
 */

export function formatMoney(value: number): string {
  return `$${new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(value)}`;
}

export function computeDelta(current: number, previous: number): number | null {
  if (!previous) return null; // sin base de comparación
  return ((current - previous) / previous) * 100;
}

export function KpiCard({
  label,
  value,
  delta,
  hint,
  icon: Icon,
  tone = "primary",
  /** Si true, un delta negativo es bueno (ej: cancelaciones) */
  invertDelta = false,
}: {
  label: string;
  value: string | number;
  delta?: number | null;
  hint?: string;
  icon: LucideIcon;
  tone?: "primary" | "info" | "warning" | "danger" | "violet";
  invertDelta?: boolean;
}) {
  const toneStyles: Record<string, string> = {
    primary:
      "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400",
    info: "bg-info-50 text-info-700 dark:bg-info-900/20 dark:text-info-400",
    warning:
      "bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400",
    danger:
      "bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400",
    violet:
      "bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400",
  };

  const deltaGood =
    delta != null && (invertDelta ? delta < 0 : delta > 0);
  const deltaNeutral = delta != null && Math.round(delta) === 0;

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-muted">
            {label}
          </div>
          <div className="mt-1.5 text-2xl font-extrabold leading-none tracking-tight text-foreground sm:text-[28px]">
            {value}
          </div>
        </div>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${toneStyles[tone]}`}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-1.5 text-[11px]">
        {delta != null && (
          <span
            className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-bold ${
              deltaNeutral
                ? "bg-surface-2 text-foreground-muted"
                : deltaGood
                ? "bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400"
                : "bg-danger-100 text-danger-800 dark:bg-danger-900/20 dark:text-danger-400"
            }`}
          >
            {deltaNeutral ? (
              <Minus className="h-3 w-3" />
            ) : delta > 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(Math.round(delta))}%
          </span>
        )}
        {hint && <span className="truncate text-foreground-muted">{hint}</span>}
      </div>
    </Card>
  );
}

const DOW_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/**
 * Heatmap día-de-semana × hora con las horas pico de turnos.
 * Grid de Tailwind: sin librerías. El rango horario se deriva de los datos.
 */
export function PeakHoursHeatmap({ cells }: { cells: HeatmapCell[] }) {
  const { hours, max, byKey } = useMemo(() => {
    if (cells.length === 0) {
      return { hours: [] as number[], max: 0, byKey: new Map<string, number>() };
    }
    const hourValues = cells.map((c) => c.hour);
    const minHour = Math.min(...hourValues);
    const maxHour = Math.max(...hourValues);
    const hourRange: number[] = [];
    for (let h = minHour; h <= maxHour; h++) hourRange.push(h);
    const map = new Map<string, number>();
    for (const c of cells) map.set(`${c.dow}-${c.hour}`, c.count);
    return {
      hours: hourRange,
      max: Math.max(...cells.map((c) => c.count)),
      byKey: map,
    };
  }, [cells]);

  if (hours.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-foreground-muted">
        Sin datos suficientes en este período.
      </div>
    );
  }

  // Lunes primero (dow 1..6, luego 0=domingo)
  const dows = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="overflow-x-auto">
      <div
        className="grid min-w-105 gap-1"
        style={{
          gridTemplateColumns: `2.25rem repeat(${hours.length}, minmax(1.25rem, 1fr))`,
        }}
      >
        <div />
        {hours.map((h) => (
          <div
            key={`h-${h}`}
            className="text-center text-[10px] font-semibold text-foreground-muted"
          >
            {h}
          </div>
        ))}
        {dows.map((dow) => (
          <div key={`row-${dow}`} className="contents">
            <div className="flex items-center text-[10px] font-semibold text-foreground-muted">
              {DOW_LABELS[dow]}
            </div>
            {hours.map((h) => {
              const count = byKey.get(`${dow}-${h}`) ?? 0;
              const intensity = max > 0 ? count / max : 0;
              return (
                <div
                  key={`${dow}-${h}`}
                  title={`${DOW_LABELS[dow]} ${h}:00 — ${count} turno${count === 1 ? "" : "s"}`}
                  className="aspect-square rounded-[5px] border border-border/50"
                  style={{
                    backgroundColor:
                      count === 0
                        ? "var(--color-surface-2, #f3f4f6)"
                        : `color-mix(in srgb, var(--color-primary-500, #22c55e) ${Math.round(
                            20 + intensity * 80
                          )}%, transparent)`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[10px] text-foreground-muted">
        Menos
        {[0.15, 0.4, 0.65, 1].map((i) => (
          <span
            key={i}
            className="h-2.5 w-2.5 rounded-[3px]"
            style={{
              backgroundColor: `color-mix(in srgb, var(--color-primary-500, #22c55e) ${Math.round(
                20 + i * 80
              )}%, transparent)`,
            }}
          />
        ))}
        Más
      </div>
    </div>
  );
}

/** Encabezado de sección compacto, consistente con el dashboard principal. */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-muted">
      {children}
    </div>
  );
}
