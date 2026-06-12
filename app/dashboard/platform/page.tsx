"use client";

import { KpiCard, SectionLabel } from "@/components/analytics/widgets";
import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { usePlatformStats } from "@/hooks/useAnalytics.query";
import {
  AlertTriangle,
  Building2,
  CalendarClock,
  CreditCard,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

const chartLoading = () => (
  <div className="h-56 w-full animate-pulse rounded-xl bg-surface-2" />
);
const MonthlyBarChart = dynamic(
  () => import("@/components/analytics/charts").then((m) => m.MonthlyBarChart),
  { ssr: false, loading: chartLoading }
);

const EVENT_LABELS: Record<string, string> = {
  INITIAL_PURCHASE: "Compra inicial",
  RENEWAL: "Renovación",
  CANCELLATION: "Cancelación",
  UNCANCELLATION: "Reactivación",
  EXPIRATION: "Expiración",
  BILLING_ISSUE: "Problema de cobro",
  PRODUCT_CHANGE: "Cambio de plan",
  SUBSCRIPTION_EXTENDED: "Extensión",
  TEST: "Test",
  TRANSFER: "Transferencia",
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function daysUntil(value: string): number {
  return Math.ceil(
    (new Date(value).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
}

export default function PlatformPage() {
  const { profile } = useAuth();
  const { data, isLoading, error } = usePlatformStats();

  const isAdmin = profile?.role === "admin";

  const funnelSteps = data
    ? [
        { label: "Organizaciones", value: data.funnel.orgs },
        { label: "Con servicios", value: data.funnel.with_services },
        { label: "Con equipo", value: data.funnel.with_staff },
        { label: "Con turnos", value: data.funnel.with_appointments },
        { label: "Con licencia activa", value: data.funnel.with_active_license },
      ]
    : [];
  const funnelMax = Math.max(1, ...funnelSteps.map((s) => s.value));

  const activeSubscriptions =
    data?.subscriptions
      .filter((s) => s.status === "active")
      .reduce((sum, s) => sum + s.count, 0) ?? 0;

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Plataforma"
        description="Estadísticas globales de la plataforma: organizaciones, licencias, suscripciones y actividad."
      />
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              Plataforma
            </h1>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Salud del negocio: organizaciones, licencias y actividad.
            </p>
          </div>

          {profile && !isAdmin && (
            <Card className="p-8 text-center">
              <div className="text-sm font-bold text-foreground">
                Solo administradores
              </div>
              <div className="mt-1 text-xs text-foreground-muted">
                Esta sección es exclusiva del administrador de la plataforma.
              </div>
            </Card>
          )}

          {isAdmin && error && (
            <Card className="border-danger-200 bg-danger-50 p-5 text-sm text-danger-800 dark:border-danger-900/40 dark:bg-danger-900/20 dark:text-danger-200">
              {error.message}
            </Card>
          )}

          {isAdmin && !error && (
            <>
              {/* KPIs */}
              <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
                {isLoading || !data ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-28 animate-pulse rounded-2xl bg-surface-2"
                    />
                  ))
                ) : (
                  <>
                    <KpiCard
                      label="Organizaciones"
                      value={data.orgs.total}
                      hint={`${data.orgs.active} activas`}
                      icon={Building2}
                      tone="info"
                    />
                    <KpiCard
                      label="Licencias activas"
                      value={data.orgs.license_active}
                      hint={`${data.orgs.license_grace} en gracia · ${data.orgs.license_expired} expiradas`}
                      icon={ShieldCheck}
                      tone="primary"
                    />
                    <KpiCard
                      label="Suscripciones"
                      value={activeSubscriptions}
                      hint="activas vía tiendas"
                      icon={CreditCard}
                      tone="violet"
                    />
                    <KpiCard
                      label="Por vencer (30 d)"
                      value={data.expiring_soon.length}
                      hint="licencias a renovar"
                      icon={CalendarClock}
                      tone="warning"
                    />
                    <KpiCard
                      label="WhatsApp (30 d)"
                      value={data.whatsapp_30d.total}
                      hint={`${data.whatsapp_30d.failed} fallidos`}
                      icon={MessageSquare}
                      tone="primary"
                    />
                    <KpiCard
                      label="Errores (7 d)"
                      value={data.errors.last_7d}
                      hint={`${data.errors.unresolved} sin resolver`}
                      icon={AlertTriangle}
                      tone="danger"
                    />
                  </>
                )}
              </div>

              {/* Licencias por vencer */}
              <section className="mb-6">
                <SectionLabel>Licencias por vencer (próximos 30 días)</SectionLabel>
                <Card className="overflow-hidden p-0">
                  {isLoading || !data ? (
                    <div className="p-4">{chartLoading()}</div>
                  ) : data.expiring_soon.length === 0 ? (
                    <div className="p-6 text-center text-sm text-foreground-muted">
                      Ninguna licencia vence en los próximos 30 días. 🎉
                    </div>
                  ) : (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wide text-foreground-muted">
                          <th className="px-4 py-3">Organización</th>
                          <th className="px-4 py-3">Vence</th>
                          <th className="px-4 py-3">Origen</th>
                          <th className="px-4 py-3 text-right">Días</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.expiring_soon.map((org) => {
                          const days = daysUntil(org.license_end_date);
                          return (
                            <tr
                              key={org.id}
                              className="border-b border-border/60 last:border-0"
                            >
                              <td className="px-4 py-2.5 font-semibold text-foreground">
                                <Link
                                  href={`/dashboard/organizations/details?id=${org.id}`}
                                  className="hover:underline"
                                >
                                  {org.name}
                                </Link>
                              </td>
                              <td className="px-4 py-2.5 text-foreground-muted">
                                {formatDate(org.license_end_date)}
                              </td>
                              <td className="px-4 py-2.5 text-foreground-muted">
                                {org.subscription_platform
                                  ? `${org.subscription_platform} (${org.subscription_status ?? "?"})`
                                  : "Licencia manual"}
                              </td>
                              <td
                                className={`px-4 py-2.5 text-right font-bold ${
                                  days <= 7
                                    ? "text-danger-600 dark:text-danger-400"
                                    : "text-foreground"
                                }`}
                              >
                                {days}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </Card>
              </section>

              {/* Actividad mensual + eventos RevenueCat */}
              <div className="mb-6 grid gap-6 lg:grid-cols-3">
                <section className="lg:col-span-2">
                  <SectionLabel>Turnos por mes (toda la plataforma)</SectionLabel>
                  <Card className="p-4 sm:p-5">
                    {isLoading || !data ? (
                      chartLoading()
                    ) : (
                      <MonthlyBarChart data={data.appointments_by_month} />
                    )}
                  </Card>
                </section>
                <section>
                  <SectionLabel>Eventos RevenueCat (30 días)</SectionLabel>
                  <Card className="p-4 sm:p-5">
                    {isLoading || !data ? (
                      chartLoading()
                    ) : data.subscription_events_30d.length === 0 ? (
                      <div className="py-8 text-center text-sm text-foreground-muted">
                        Sin eventos en los últimos 30 días.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {data.subscription_events_30d.map((e) => (
                          <div
                            key={e.event_type}
                            className="flex items-center justify-between rounded-lg bg-surface-2 px-3 py-2"
                          >
                            <span className="text-xs font-semibold text-foreground-muted">
                              {EVENT_LABELS[e.event_type] ?? e.event_type}
                            </span>
                            <span className="text-sm font-extrabold text-foreground">
                              {e.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </section>
              </div>

              {/* Top orgs + orgs en riesgo */}
              <div className="mb-6 grid gap-6 lg:grid-cols-2">
                <section>
                  <SectionLabel>Top organizaciones (turnos, 30 días)</SectionLabel>
                  <Card className="p-4 sm:p-5">
                    {isLoading || !data ? (
                      chartLoading()
                    ) : data.top_orgs_30d.length === 0 ? (
                      <div className="py-8 text-center text-sm text-foreground-muted">
                        Sin actividad en los últimos 30 días.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2.5">
                        {data.top_orgs_30d.map((org, i) => {
                          const max = data.top_orgs_30d[0]?.appointments || 1;
                          return (
                            <div key={org.id} className="flex items-center gap-3">
                              <div className="w-5 shrink-0 text-xs font-bold text-foreground-subtle">
                                {i + 1}
                              </div>
                              <div className="w-36 min-w-0 shrink-0 truncate text-xs font-semibold text-foreground">
                                {org.name}
                              </div>
                              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                                <div
                                  className="h-full rounded-full bg-primary-500"
                                  style={{
                                    width: `${(org.appointments / max) * 100}%`,
                                  }}
                                />
                              </div>
                              <div className="w-10 shrink-0 text-right text-xs font-bold text-foreground">
                                {org.appointments}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </Card>
                </section>
                <section>
                  <SectionLabel>Riesgo de churn (sin turnos hace 14+ días)</SectionLabel>
                  <Card className="p-4 sm:p-5">
                    {isLoading || !data ? (
                      chartLoading()
                    ) : data.inactive_orgs_14d.length === 0 ? (
                      <div className="py-8 text-center text-sm text-foreground-muted">
                        Todas las organizaciones tienen actividad reciente. 🎉
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {data.inactive_orgs_14d.map((org) => (
                          <div
                            key={org.id}
                            className="flex items-center justify-between gap-3 rounded-lg bg-warning-50 px-3 py-2 dark:bg-warning-900/15"
                          >
                            <Link
                              href={`/dashboard/organizations/details?id=${org.id}`}
                              className="min-w-0 truncate text-xs font-semibold text-foreground hover:underline"
                            >
                              {org.name}
                            </Link>
                            <span className="shrink-0 text-[11px] text-foreground-muted">
                              {org.last_appointment_at
                                ? `Último: ${formatDate(org.last_appointment_at)}`
                                : "Nunca creó un turno"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card>
                </section>
              </div>

              {/* Embudo de adopción */}
              <section>
                <SectionLabel>Embudo de adopción</SectionLabel>
                <Card className="p-4 sm:p-5">
                  {isLoading || !data ? (
                    <div className="h-32 w-full animate-pulse rounded-xl bg-surface-2" />
                  ) : (
                    <div className="flex flex-col gap-2.5">
                      {funnelSteps.map((step) => (
                        <div key={step.label} className="flex items-center gap-3">
                          <div className="w-36 shrink-0 text-xs font-semibold text-foreground-muted">
                            {step.label}
                          </div>
                          <div className="h-5 flex-1 overflow-hidden rounded-md bg-surface-2">
                            <div
                              className="flex h-full items-center rounded-md bg-info-500 px-2 text-[10px] font-bold text-white"
                              style={{
                                width: `${Math.max(
                                  6,
                                  (step.value / funnelMax) * 100
                                )}%`,
                              }}
                            >
                              {step.value}
                            </div>
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
