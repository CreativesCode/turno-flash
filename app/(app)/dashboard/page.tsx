"use client";

import { ApptRow, formatTime } from "@/components/appointments/ApptRow";
import {
  LicenseNotification,
  LicenseNotificationBanner,
} from "@/components/license-notification";
import { SetupGuide } from "@/components/onboarding/SetupGuide";
import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import {
  Alert,
  Button,
  Card,
  EmptyState,
  IconTile,
  ListGroup,
  SectionLabel,
} from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import {
  useAppointments,
  useUpdateAppointmentStatus,
} from "@/hooks/useAppointments.query";
import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";
import { usePendingTripBookingsCount } from "@/hooks/useTripBookings.query";
import { useErrorStatsQuery } from "@/hooks/useErrorLogs.query";
import { useLicense } from "@/hooks/useLicense";
import type { AppointmentStatus } from "@/types/appointments";
import { NEXT_ACTIONS } from "@/utils/appointment-status";
import { shouldShowLicenseNotification } from "@/utils/license";
import { createClient } from "@/utils/supabase/client";
import {
  AlertTriangle,
  Bus,
  Calendar,
  ChevronRight,
  Lock,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Logger } from "@/utils/logger";
import { toast } from "sonner";

// Today in YYYY-MM-DD (local timezone). Computed once per render.
function getTodayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;
}

const TODAY_LABEL_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: "long",
  day: "numeric",
  month: "long",
};

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Buen día";
  if (hour < 20) return "Buenas tardes";
  return "Buenas noches";
}

/** The day's bar and legend, in the order the work moves. */
const DAY_GROUPS: {
  key: "completed" | "inProgress" | "checkedIn" | "confirmed" | "pending";
  label: string;
  status: AppointmentStatus;
}[] = [
  { key: "completed", label: "Terminados", status: "completed" },
  { key: "inProgress", label: "En curso", status: "in_progress" },
  { key: "checkedIn", label: "Llegaron", status: "checked_in" },
  { key: "confirmed", label: "Confirmados", status: "confirmed" },
  { key: "pending", label: "Pendientes", status: "pending" },
];

function firstName(profileFullName?: string | null, fallback?: string): string {
  if (profileFullName) {
    const first = profileFullName.split(" ")[0];
    if (first) return first;
  }
  if (fallback) {
    // Si el fallback es un email, mostrar solo la parte local (antes de @)
    const local = fallback.split("@")[0];
    return local || fallback;
  }
  return "Usuario";
}

export default function DashboardPage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { modules } = useOrganizationModules();
  // Today's stats, "Nuevo turno" and the upcoming list only make sense for a
  // business that takes appointments; a bus agency would see empty counters.
  const showAppointments = !!profile?.organization_id && modules.appointments;
  const pendingTripBookings = usePendingTripBookingsCount(modules.trips);

  // Shared with the license gate instead of a request of its own (P2-04)
  const { licenseStatus, loading: loadingLicense, isBlocked } = useLicense();
  const [adminCounts, setAdminCounts] = useState<{
    organizations: number;
    users: number;
  } | null>(null);

  const isAdminWithoutOrg =
    profile?.role === "admin" && !profile?.organization_id;

  // Stats de errores para hero de admin (solo cuando admin sin org)
  const { data: errorStats } = useErrorStatsQuery(7, isAdminWithoutOrg);

  // Platform counters for the admin
  useEffect(() => {
    let isMounted = true;

    const loadAdminCounts = async () => {
      if (profile?.role !== "admin") {
        if (isMounted) setAdminCounts(null);
        return;
      }
      try {
        const [orgsRes, usersRes] = await Promise.all([
          supabase
            .from("organizations")
            .select("*", { count: "exact", head: true }),
          supabase
            .from("user_profiles")
            .select("*", { count: "exact", head: true }),
        ]);
        if (!isMounted) return;
        setAdminCounts({
          organizations: orgsRes.count ?? 0,
          users: usersRes.count ?? 0,
        });
      } catch (error) {
        if (!isMounted) return;
        void Logger.error("Error loading admin counts:", error);
        setAdminCounts(null);
      }
    };

    if (profile) {
      loadAdminCounts();
    }

    return () => {
      isMounted = false;
    };
  }, [profile, supabase]);

  // Today's appointments (only fetched if user has org). The hook already
  // returns [] when profile.organization_id is missing.
  // Recomputed when the app comes back: left open overnight, "Hoy" was
  // still yesterday
  const [todayString, setTodayString] = useState(getTodayString);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setTodayString(getTodayString());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  const { appointments } = useAppointments({
    startDate: todayString,
    endDate: todayString,
  });

  // Group counts by status, for the day's summary.
  const stats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of appointments) {
      const k = a.status ?? "pending";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const statusCount = (...keys: AppointmentStatus[]) =>
      keys.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
    return {
      // Cancelled and no-shows are not part of the day's work
      total:
        appointments.length - statusCount("cancelled", "no_show"),
      confirmed: statusCount("confirmed", "client_confirmed", "reminded"),
      pending: counts.pending ?? 0,
      checkedIn: counts.checked_in ?? 0,
      inProgress: counts.in_progress ?? 0,
      completed: counts.completed ?? 0,
    };
  }, [appointments]);

  // What is happening right now: the turn in progress, or else who arrived
  const current = useMemo(
    () =>
      appointments.find((a) => a.status === "in_progress") ??
      appointments.find((a) => a.status === "checked_in") ??
      null,
    [appointments]
  );
  const updateStatusMutation = useUpdateAppointmentStatus();
  const currentNext = current?.status ? NEXT_ACTIONS[current.status] : null;
  const advanceCurrent = () => {
    if (!current || !currentNext) return;
    updateStatusMutation.mutate(
      { appointmentId: current.id, newStatus: currentNext.to },
      {
        onError: (error) =>
          toast.error(
            error instanceof Error
              ? error.message
              : "No se pudo actualizar el turno"
          ),
      }
    );
  };

  // Next 3 upcoming non-terminal appointments — sorted by start_time.
  const upcoming = useMemo(() => {
    const eligible: AppointmentStatus[] = [
      "pending",
      "confirmed",
      "reminded",
      "client_confirmed",
    ];
    return appointments
      .filter((a) => a.status && eligible.includes(a.status))
      .sort((a, b) => (a.start_time ?? "").localeCompare(b.start_time ?? ""))
      .slice(0, 3);
  }, [appointments]);

  const greetName = firstName(profile?.full_name, profile?.email ?? undefined);
  const todayLabel = useMemo(() => {
    const label = new Date().toLocaleDateString("es", TODAY_LABEL_OPTIONS);
    return label.charAt(0).toUpperCase() + label.slice(1).replace(",", "");
  }, []);

  // Si está bloqueado por licencia expirada, mostrar pantalla de bloqueo
  if (isBlocked && profile?.role !== "admin") {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          {licenseStatus && (
            <LicenseNotificationBanner licenseStatus={licenseStatus} />
          )}
          <div className="flex min-h-screen items-center justify-center px-4">
            <Card className="w-full max-w-md p-8 text-center">
              <IconTile tone="danger" size={52} className="mx-auto">
                <Lock />
              </IconTile>
              <h1 className="mt-5 text-title font-semibold text-foreground">
                Acceso bloqueado
              </h1>
              <p className="mt-3 text-body text-foreground-muted">
                La licencia de tu organización ha expirado. Por favor, contacta
                al administrador para renovarla y continuar usando la
                aplicación.
              </p>
              {licenseStatus && (
                <div className="mt-6">
                  <LicenseNotification
                    licenseStatus={licenseStatus}
                    dismissible={false}
                  />
                </div>
              )}
              <Button
                variant="danger"
                size="lg"
                className="mt-6 w-full"
                onClick={() => signOut().then(() => router.push("/login"))}
              >
                Cerrar sesión
              </Button>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <PageMetadata
        title="Panel de Control"
        description="Accede a tu panel de control de Turno Flash. Gestiona turnos, clientes, servicios y profesionales desde un solo lugar."
      />
      <div className="mx-auto max-w-4xl px-5 pb-10 pt-5 lg:px-8 lg:pt-8">
        {/* Greeting */}
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <div className="text-meta font-medium text-foreground-subtle">
              {todayLabel}
            </div>
            <h1 className="mt-1 break-words font-display text-[40px] leading-[1.05] text-foreground">
              {greeting()}, {greetName}
            </h1>
          </div>
          {showAppointments && (
            <Button
              onClick={() => router.push("/dashboard/appointments?create=1")}
              className="shrink-0 max-lg:hidden"
            >
              <Plus className="size-[18px]" /> Nuevo turno
            </Button>
          )}
        </div>

        {/* Notificación de licencia (versión completa) */}
        {!loadingLicense &&
          licenseStatus &&
          shouldShowLicenseNotification(licenseStatus) &&
          // Only the owner pays: an employee sees just the block screen
          profile?.role === "owner" && (
            <div className="mt-[22px]">
              <LicenseNotification licenseStatus={licenseStatus} />
            </div>
          )}

        {/* Primeros pasos de un dueño nuevo */}
        <div className="mt-[22px] empty:hidden">
          <SetupGuide />
        </div>

        {/* Admin without a business: the platform at a glance */}
        {isAdminWithoutOrg && (
          <>
            <SectionLabel>Resumen del sistema</SectionLabel>
            <Card className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4">
              <AdminStat
                label="Organizaciones"
                value={adminCounts?.organizations ?? 0}
              />
              <AdminStat label="Usuarios" value={adminCounts?.users ?? 0} />
              <AdminStat
                label="Errores hoy"
                value={errorStats?.errors_today ?? 0}
              />
              <AdminStat
                label="Sin resolver"
                value={errorStats?.unresolved_errors ?? 0}
              />
            </Card>
          </>
        )}

        {/* The day at a glance */}
        {showAppointments && (
          <Card className="mt-[22px] p-5">
            <div className="flex items-baseline gap-2.5">
              <span className="font-display text-[60px] leading-[0.9] text-foreground">
                {stats.total}
              </span>
              <span className="text-body font-medium text-foreground-muted">
                {stats.total === 1 ? "turno hoy" : "turnos hoy"}
              </span>
              <span className="ml-auto text-meta text-foreground-subtle">
                {stats.completed}{" "}
                {stats.completed === 1 ? "terminado" : "terminados"}
              </span>
            </div>
            {stats.total > 0 && (
              <div className="mt-[18px] flex h-2 gap-[3px]">
                {DAY_GROUPS.filter((group) => stats[group.key] > 0).map(
                  (group) => (
                    <span
                      key={group.key}
                      className={`st-${group.status} rounded-[4px] bg-[var(--st-c)]`}
                      style={{ flexGrow: stats[group.key] }}
                    />
                  )
                )}
              </div>
            )}
            <div className="mt-[18px] grid grid-cols-2 gap-x-5 gap-y-2.5">
              {DAY_GROUPS.map((group) => (
                <div key={group.key} className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className={`st-${group.status} size-2 shrink-0 rounded-full bg-[var(--st-c)]`}
                  />
                  <span className="flex-1 text-meta text-foreground-muted">
                    {group.label}
                  </span>
                  <span className="font-mono font-medium tabular-nums text-foreground">
                    {stats[group.key]}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Sin organización (no admins) */}
        {!profile?.organization_id && profile?.role !== "admin" && (
          <Alert variant="warning" icon={<AlertTriangle />} className="mt-[22px]">
            {profile?.is_active === false ? (
              <>
                <h3 className="text-body font-semibold">
                  Tu acceso fue desactivado
                </h3>
                <p className="mt-1">
                  Ya no tienes acceso a este negocio. Si crees que es un error,
                  habla con quien lo administra.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-body font-semibold">
                  Sin organización asignada
                </h3>
                <p className="mt-1">
                  Necesitas que un administrador te asigne a una organización
                  para acceder al sistema de gestión de turnos.
                </p>
              </>
            )}
          </Alert>
        )}

        {/* Now */}
        {showAppointments && current && (
          <section>
            <SectionLabel>Ahora</SectionLabel>
            <div className="flex items-center gap-3.5 rounded-card bg-primary-100 p-4 pl-[18px] dark:bg-primary-900">
              <button
                type="button"
                onClick={() =>
                  router.push(`/dashboard/appointments?id=${current.id}`)
                }
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-3.5 text-left"
              >
                <div className="flex min-w-12 flex-col gap-0.5">
                  <span className="font-mono text-[16px] font-semibold tabular-nums text-primary-700 dark:text-primary-400">
                    {formatTime(current.start_time)}
                  </span>
                  <span className="text-caption text-primary-700/80 dark:text-primary-400/80">
                    hasta {formatTime(current.end_time)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[16px] font-semibold text-foreground">
                    {`${current.customer_first_name} ${current.customer_last_name}`.trim() ||
                      "Sin nombre"}
                  </div>
                  <div className="mt-[3px] truncate text-meta text-foreground-muted">
                    {[
                      current.service_name,
                      current.staff_nickname || current.staff_first_name,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              </button>
              {currentNext && (
                <Button
                  size="sm"
                  onClick={advanceCurrent}
                  disabled={updateStatusMutation.isPending}
                  className="shrink-0"
                >
                  {currentNext.label}
                </Button>
              )}
            </div>
          </section>
        )}

        {/* Próximos turnos */}
        {showAppointments && (
          <section>
            <SectionLabel
              action={
                <button
                  type="button"
                  onClick={() => router.push("/dashboard/appointments")}
                  className="cursor-pointer"
                >
                  Ver agenda
                </button>
              }
            >
              Próximos
            </SectionLabel>
            {upcoming.length === 0 ? (
              <EmptyState icon={<Calendar />} title="No hay turnos próximos hoy">
                Crea uno o consulta el calendario completo.
              </EmptyState>
            ) : (
              <ListGroup>
                {upcoming.map((a) => (
                  <ApptRow
                    key={a.id}
                    appointment={a}
                    onOpen={() =>
                      router.push(`/dashboard/appointments?id=${a.id}`)
                    }
                  />
                ))}
              </ListGroup>
            )}
          </section>
        )}

        {/* Seat bookings waiting for the owner's approval */}
        {pendingTripBookings > 0 && (
          <button
            type="button"
            onClick={() => router.push("/dashboard/trips")}
            className="mt-4 flex w-full cursor-pointer items-center gap-3.5 rounded-card border border-border bg-surface p-4 text-left shadow-card transition-colors hover:bg-muted"
          >
            <IconTile tone="pink">
              <Bus />
            </IconTile>
            <div className="min-w-0 flex-1">
              <div className="text-body font-semibold text-foreground">
                {pendingTripBookings}{" "}
                {pendingTripBookings === 1
                  ? "reserva por aprobar"
                  : "reservas por aprobar"}
              </div>
              <div className="text-meta text-foreground-muted">
                Pasajes que esperan tu respuesta
              </div>
            </div>
            <ChevronRight
              aria-hidden
              className="size-[18px] text-foreground-subtle"
            />
          </button>
        )}
      </div>
    </ProtectedRoute>
  );
}

// ───────────────────────────────────────────────────────────
// Local helpers (only used by this page)
// ───────────────────────────────────────────────────────────

function AdminStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-control bg-surface-2 p-3">
      <div className="text-caption text-foreground-muted">{label}</div>
      <div className="mt-0.5 font-mono text-title tabular-nums text-foreground">
        {value}
      </div>
    </div>
  );
}
