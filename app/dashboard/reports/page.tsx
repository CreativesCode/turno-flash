"use client";

import {
  KpiCard,
  PeakHoursHeatmap,
  SectionLabel,
  computeDelta,
  formatMoney,
} from "@/components/analytics/widgets";
import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useOrganizationAnalytics } from "@/hooks/useAnalytics.query";
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  Star,
  UserPlus,
  XCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

// recharts solo en cliente y fuera del bundle inicial
const chartLoading = () => (
  <div className="h-60 w-full animate-pulse rounded-xl bg-surface-2" />
);
const RevenueAreaChart = dynamic(
  () => import("@/components/analytics/charts").then((m) => m.RevenueAreaChart),
  { ssr: false, loading: chartLoading }
);
const StatusDonut = dynamic(
  () => import("@/components/analytics/charts").then((m) => m.StatusDonut),
  { ssr: false, loading: chartLoading }
);
const TopServicesBars = dynamic(
  () => import("@/components/analytics/charts").then((m) => m.TopServicesBars),
  { ssr: false, loading: chartLoading }
);

type PeriodKey = "7d" | "30d" | "90d" | "month";

const PERIODS: readonly { key: PeriodKey; label: string }[] = [
  { key: "7d", label: "7 días" },
  { key: "30d", label: "30 días" },
  { key: "90d", label: "90 días" },
  { key: "month", label: "Este mes" },
];

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

function getPeriodRange(period: PeriodKey): { start: string; end: string } {
  const today = new Date();
  if (period === "month") {
    return {
      start: toDateString(new Date(today.getFullYear(), today.getMonth(), 1)),
      end: toDateString(today),
    };
  }
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  return { start: toDateString(start), end: toDateString(today) };
}

const STATUS_LABELS_ES: Record<string, string> = {
  pending: "Pendiente",
  confirmed: "Confirmado",
  reminded: "Recordado",
  client_confirmed: "Cliente confirmó",
  checked_in: "Check-in",
  in_progress: "En progreso",
  completed: "Completado",
  cancelled: "Cancelado",
  no_show: "No asistió",
  rescheduled: "Reagendado",
};

function getStatusLabel(status: string): string {
  return STATUS_LABELS_ES[status] ?? status;
}

const SOURCE_LABELS: Record<string, string> = {
  web: "Web",
  whatsapp: "WhatsApp",
  phone: "Teléfono",
  walk_in: "Sin cita previa",
  admin: "Manual",
};

export default function ReportsPage() {
  const { profile } = useAuth();
  const [period, setPeriod] = useState<PeriodKey>("30d");

  const { start, end } = useMemo(() => getPeriodRange(period), [period]);
  const { data, isLoading, error } = useOrganizationAnalytics(start, end);

  const canView =
    (profile?.role === "owner" || profile?.role === "admin") &&
    !!profile?.organization_id;

  const summary = data?.summary;
  const previous = data?.previous;

  const maxSourceCount = useMemo(
    () => Math.max(1, ...(data?.source_counts.map((s) => s.count) ?? [1])),
    [data?.source_counts]
  );

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Reportes"
        description="Reportes y estadísticas de tu negocio: ingresos, servicios más pedidos, horas pico y rendimiento del equipo."
      />
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Header */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                Reportes
              </h1>
              <p className="mt-0.5 text-sm text-foreground-muted">
                Cómo va tu negocio, en números.
              </p>
            </div>
            <div className="flex rounded-xl border border-border bg-surface p-1">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriod(p.key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                    period === p.key
                      ? "bg-primary-500 text-white shadow-sm"
                      : "text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sin permisos */}
          {profile && !canView && (
            <Card className="p-8 text-center">
              <div className="text-sm font-bold text-foreground">
                Solo los dueños pueden ver los reportes
              </div>
              <div className="mt-1 text-xs text-foreground-muted">
                Pedile acceso al dueño de tu organización.
              </div>
            </Card>
          )}

          {/* Error */}
          {canView && error && (
            <Card className="border-danger-200 bg-danger-50 p-5 text-sm text-danger-800 dark:border-danger-900/40 dark:bg-danger-900/20 dark:text-danger-200">
              {error.message}
            </Card>
          )}

          {canView && !error && (
            <>
              {/* KPIs */}
              <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                {isLoading || !summary ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-28 animate-pulse rounded-2xl bg-surface-2"
                    />
                  ))
                ) : (
                  <>
                    <KpiCard
                      label="Ingresos"
                      value={formatMoney(summary.revenue)}
                      delta={computeDelta(summary.revenue, previous?.revenue ?? 0)}
                      hint="vs período anterior"
                      icon={DollarSign}
                      tone="primary"
                    />
                    <KpiCard
                      label="Turnos"
                      value={summary.total}
                      delta={computeDelta(summary.total, previous?.total ?? 0)}
                      hint="vs período anterior"
                      icon={Calendar}
                      tone="info"
                    />
                    <KpiCard
                      label="Completados"
                      value={summary.completed}
                      delta={computeDelta(
                        summary.completed,
                        previous?.completed ?? 0
                      )}
                      hint="vs período anterior"
                      icon={CheckCircle2}
                      tone="primary"
                    />
                    <KpiCard
                      label="Cancelados + No-show"
                      value={summary.cancelled + summary.no_show}
                      delta={computeDelta(
                        summary.cancelled + summary.no_show,
                        (previous?.cancelled ?? 0) + (previous?.no_show ?? 0)
                      )}
                      invertDelta
                      hint={`${formatMoney(summary.revenue_lost)} perdidos`}
                      icon={XCircle}
                      tone="danger"
                    />
                    <KpiCard
                      label="Clientes nuevos"
                      value={summary.new_customers}
                      delta={computeDelta(
                        summary.new_customers,
                        previous?.new_customers ?? 0
                      )}
                      hint={`${summary.unique_customers} atendidos`}
                      icon={UserPlus}
                      tone="violet"
                    />
                    <KpiCard
                      label="Rating promedio"
                      value={summary.avg_rating != null ? `${summary.avg_rating}★` : "—"}
                      hint={
                        summary.ratings_count > 0
                          ? `${summary.ratings_count} valoraciones`
                          : "Sin valoraciones aún"
                      }
                      icon={Star}
                      tone="warning"
                    />
                  </>
                )}
              </div>

              {/* Ingresos por día */}
              <section className="mb-6">
                <SectionLabel>Ingresos por día</SectionLabel>
                <Card className="p-4 sm:p-5">
                  {isLoading || !data ? (
                    chartLoading()
                  ) : (
                    <RevenueAreaChart data={data.revenue_by_day} />
                  )}
                </Card>
              </section>

              {/* Estados + Top servicios */}
              <div className="mb-6 grid gap-6 lg:grid-cols-2">
                <section>
                  <SectionLabel>Turnos por estado</SectionLabel>
                  <Card className="p-4 sm:p-5">
                    {isLoading || !data ? (
                      chartLoading()
                    ) : data.status_counts.length === 0 ? (
                      <EmptyState />
                    ) : (
                      <>
                        <StatusDonut
                          data={data.status_counts}
                          getLabel={getStatusLabel}
                        />
                        <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
                          {data.status_counts.map((s) => (
                            <span
                              key={s.status}
                              className="text-[11px] font-semibold text-foreground-muted"
                            >
                              {getStatusLabel(s.status)}: {s.count}
                            </span>
                          ))}
                        </div>
                      </>
                    )}
                  </Card>
                </section>
                <section>
                  <SectionLabel>Top servicios por ingresos</SectionLabel>
                  <Card className="p-4 sm:p-5">
                    {isLoading || !data ? (
                      chartLoading()
                    ) : data.top_services.length === 0 ? (
                      <EmptyState />
                    ) : (
                      <TopServicesBars data={data.top_services} />
                    )}
                  </Card>
                </section>
              </div>

              {/* Profesionales + Horas pico */}
              <div className="mb-6 grid gap-6 lg:grid-cols-2">
                <section>
                  <SectionLabel>Rendimiento del equipo</SectionLabel>
                  <Card className="overflow-hidden p-0">
                    {isLoading || !data ? (
                      <div className="p-4">{chartLoading()}</div>
                    ) : data.top_staff.length === 0 ? (
                      <div className="p-4">
                        <EmptyState />
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-foreground-muted">
                            <th className="px-4 py-3">Profesional</th>
                            <th className="px-4 py-3 text-right">Turnos</th>
                            <th className="px-4 py-3 text-right">Ingresos</th>
                            <th className="px-4 py-3 text-right">Rating</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.top_staff.map((s) => (
                            <tr
                              key={s.name}
                              className="border-b border-border/60 last:border-0"
                            >
                              <td className="px-4 py-2.5 font-semibold text-foreground">
                                {s.name}
                              </td>
                              <td className="px-4 py-2.5 text-right text-foreground-muted">
                                {s.appointments}
                              </td>
                              <td className="px-4 py-2.5 text-right font-semibold text-foreground">
                                {formatMoney(s.revenue)}
                              </td>
                              <td className="px-4 py-2.5 text-right text-foreground-muted">
                                {s.avg_rating != null ? `${s.avg_rating}★` : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </Card>
                </section>
                <section>
                  <SectionLabel>Horas pico</SectionLabel>
                  <Card className="p-4 sm:p-5">
                    {isLoading || !data ? (
                      chartLoading()
                    ) : (
                      <PeakHoursHeatmap cells={data.heatmap} />
                    )}
                  </Card>
                </section>
              </div>

              {/* Origen de reservas */}
              <section>
                <SectionLabel>Origen de las reservas</SectionLabel>
                <Card className="p-4 sm:p-5">
                  {isLoading || !data ? (
                    <div className="h-24 w-full animate-pulse rounded-xl bg-surface-2" />
                  ) : data.source_counts.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {data.source_counts.map((s) => (
                        <div key={s.source} className="flex items-center gap-3">
                          <div className="w-28 shrink-0 text-xs font-semibold text-foreground-muted">
                            {SOURCE_LABELS[s.source] ?? s.source}
                          </div>
                          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                            <div
                              className="h-full rounded-full bg-info-500"
                              style={{
                                width: `${(s.count / maxSourceCount) * 100}%`,
                              }}
                            />
                          </div>
                          <div className="w-10 shrink-0 text-right text-xs font-bold text-foreground">
                            {s.count}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </section>
            </>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

function EmptyState() {
  return (
    <div className="py-8 text-center text-sm text-foreground-muted">
      Sin datos en este período.
    </div>
  );
}
