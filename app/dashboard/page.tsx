"use client";

import { ApptRow } from "@/components/appointments/ApptRow";
import {
  LicenseNotification,
  LicenseNotificationBanner,
} from "@/components/license-notification";
import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { Avatar, Button, Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useAppointments } from "@/hooks/useAppointments.query";
import { useErrorStatsQuery } from "@/hooks/useErrorLogs.query";
import type { AppointmentStatus } from "@/types/appointments";
import { LicenseStatusResult } from "@/types/organization";
import {
  canUseApplication,
  getMyOrganizationLicenseStatus,
  shouldShowLicenseNotification,
} from "@/utils/license";
import { createClient } from "@/utils/supabase/client";
import {
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  type LucideIcon,
  Package,
  Plus,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Logger } from "@/utils/logger";

interface ShortcutCard {
  key: string;
  title: string;
  subtitle: string;
  Icon: LucideIcon;
  mesh: string;
  href: string;
  /** If set, only roles in this list see the card. */
  roles?: string[];
  /** If true, requires the user to have an organization. */
  requiresOrg?: boolean;
}

const SHORTCUTS: readonly ShortcutCard[] = [
  {
    key: "appointments",
    title: "Turnos",
    subtitle: "Ver y crear turnos",
    Icon: Calendar,
    mesh: "mesh-info",
    href: "/dashboard/appointments",
    requiresOrg: true,
  },
  {
    key: "customers",
    title: "Clientes",
    subtitle: "Base de clientes",
    Icon: Users,
    mesh: "mesh-primary",
    href: "/dashboard/customers",
    requiresOrg: true,
  },
  {
    key: "reminders",
    title: "Recordatorios",
    subtitle: "Enviar por WhatsApp",
    Icon: Bell,
    mesh: "mesh-secondary",
    href: "/dashboard/reminders",
    requiresOrg: true,
  },
  {
    key: "services",
    title: "Servicios",
    subtitle: "CatÃ¡logo y precios",
    Icon: Package,
    mesh: "mesh-warn",
    href: "/dashboard/services",
    roles: ["admin", "owner"],
    requiresOrg: true,
  },
  {
    key: "staff",
    title: "Profesionales",
    subtitle: "Equipo de trabajo",
    Icon: UserCog,
    mesh: "mesh-violet",
    href: "/dashboard/staff",
    roles: ["admin", "owner"],
    requiresOrg: true,
  },
  {
    key: "organizations",
    title: "Organizaciones",
    subtitle: "Negocios y licencias",
    Icon: Building2,
    mesh: "mesh-info",
    href: "/dashboard/organizations",
    roles: ["admin"],
  },
  {
    key: "users",
    title: "Usuarios",
    subtitle: "Cuentas del sistema",
    Icon: Users,
    mesh: "mesh-primary",
    href: "/dashboard/users",
    roles: ["admin"],
  },
  {
    key: "invite",
    title: "Invitar",
    subtitle: "Sumar gente al equipo",
    Icon: UserPlus,
    mesh: "mesh-secondary",
    href: "/dashboard/invite",
    roles: ["admin", "owner"],
  },
  {
    key: "errors",
    title: "Errores",
    subtitle: "Logs de la app",
    Icon: AlertTriangle,
    mesh: "mesh-warn",
    href: "/dashboard/errors",
    roles: ["admin", "owner"],
  },
];

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
  month: "short",
};

function roleLabel(role?: string): string {
  if (role === "admin") return "Administrador";
  if (role === "owner") return "DueÃ±o";
  return "Staff";
}

function firstName(profileFullName?: string | null, fallback?: string): string {
  if (profileFullName) {
    const first = profileFullName.split(" ")[0];
    if (first) return first;
  }
  return fallback ?? "Usuario";
}

export default function DashboardPage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [licenseStatus, setLicenseStatus] =
    useState<LicenseStatusResult | null>(null);
  const [loadingLicense, setLoadingLicense] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);
  const [adminCounts, setAdminCounts] = useState<{
    organizations: number;
    users: number;
  } | null>(null);

  const isAdminWithoutOrg =
    profile?.role === "admin" && !profile?.organization_id;

  // Stats de errores para hero de admin (solo cuando admin sin org)
  const { data: errorStats } = useErrorStatsQuery(7);

  // Cargar estado de licencia y nombre de organizaciÃ³n al montar el componente
  useEffect(() => {
    let isMounted = true;

    const loadLicenseStatus = async () => {
      try {
        if (!profile?.organization_id && profile?.role !== "admin") {
          if (isMounted) setLoadingLicense(false);
          return;
        }

        const status = await getMyOrganizationLicenseStatus();
        if (!isMounted) return;

        setLicenseStatus(status);
        if (status && !canUseApplication(status)) {
          setIsBlocked(true);
        }
      } catch (error) {
        void Logger.error("Error loading license status:", error);
      } finally {
        if (isMounted) setLoadingLicense(false);
      }
    };

    const loadOrganizationName = async () => {
      if (!profile?.organization_id) {
        if (isMounted) setOrganizationName(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", profile.organization_id)
          .single();

        if (!isMounted) return;

        if (error) {
          setOrganizationName(null);
        } else {
          setOrganizationName(data?.name || null);
        }
      } catch (error) {
        if (!isMounted) return;
        void Logger.error("Error loading organization name:", error);
        setOrganizationName(null);
      }
    };

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
      loadLicenseStatus();
      loadOrganizationName();
      loadAdminCounts();
    }

    return () => {
      isMounted = false;
    };
  }, [profile, supabase]);

  // Today's appointments (only fetched if user has org). The hook already
  // returns [] when profile.organization_id is missing.
  const todayString = useMemo(() => getTodayString(), []);
  const { appointments } = useAppointments({
    startDate: todayString,
    endDate: todayString,
  });

  // Group counts by status â€” used by both the hero stat and shortcut subtitles.
  const stats = useMemo(() => {
    const total = appointments.length;
    const counts: Record<string, number> = {};
    for (const a of appointments) {
      const k = a.status ?? "pending";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    const statusCount = (...keys: AppointmentStatus[]) =>
      keys.reduce((sum, k) => sum + (counts[k] ?? 0), 0);
    return {
      total,
      confirmed: statusCount("confirmed", "client_confirmed", "reminded"),
      pending: counts.pending ?? 0,
      inProgress: statusCount("checked_in", "in_progress"),
      completed: counts.completed ?? 0,
    };
  }, [appointments]);

  // Visible shortcut cards â€” filtered by role and org requirement.
  const visibleShortcuts = useMemo(() => {
    const role = profile?.role;
    const hasOrg = !!profile?.organization_id;
    return SHORTCUTS.filter((s) => {
      if (s.roles && (!role || !s.roles.includes(role))) return false;
      if (s.requiresOrg && !hasOrg) return false;
      return true;
    });
  }, [profile?.role, profile?.organization_id]);

  // Next 3 upcoming non-terminal appointments â€” sorted by start_time.
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
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString("es-AR", TODAY_LABEL_OPTIONS).replace(",", " Â·"),
    []
  );

  // Si estÃ¡ bloqueado por licencia expirada, mostrar pantalla de bloqueo
  if (isBlocked && profile?.role !== "admin") {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          {licenseStatus && (
            <LicenseNotificationBanner licenseStatus={licenseStatus} />
          )}
          <div className="flex min-h-screen items-center justify-center px-4">
            <Card className="w-full max-w-md p-8 text-center shadow-lg">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-100 dark:bg-danger-900/20">
                <span className="text-3xl">ðŸš«</span>
              </div>
              <h1 className="mt-6 text-2xl font-bold text-foreground">
                Acceso Bloqueado
              </h1>
              <p className="mt-4 text-sm text-foreground-muted">
                La licencia de tu organizaciÃ³n ha expirado. Por favor, contacta
                al administrador para renovarla y continuar usando la
                aplicaciÃ³n.
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
                size="md"
                className="mt-6 w-full"
                onClick={() => signOut().then(() => router.push("/login"))}
              >
                Cerrar sesiÃ³n
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
      <div className="min-h-screen bg-background">
        {/* Banner de notificaciÃ³n de licencia en la parte superior */}
        {licenseStatus && shouldShowLicenseNotification(licenseStatus) && (
          <LicenseNotificationBanner licenseStatus={licenseStatus} />
        )}

        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Header */}
          <div className="mb-6 flex items-center justify-between gap-4 lg:mb-8">
            <div className="min-w-0">
              {organizationName && (
                <div className="truncate text-xs font-semibold text-foreground-muted lg:text-[13px]">
                  {organizationName} Â· {todayLabel}
                </div>
              )}
              <h1 className="mt-0.5 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                Hola, {greetName} ðŸ‘‹
              </h1>
            </div>
            <div className="flex items-center gap-3">
              {profile?.organization_id && (
                <Button
                  variant="mesh-primary"
                  size="md"
                  onClick={() =>
                    router.push("/dashboard/appointments?create=1")
                  }
                  className="hidden sm:inline-flex"
                >
                  <Plus className="h-4 w-4" /> Nuevo turno
                </Button>
              )}
              <Avatar
                name={profile?.full_name || profile?.email || "Usuario"}
                color="var(--color-secondary-500)"
                size={40}
              />
            </div>
          </div>

          {/* NotificaciÃ³n de licencia (versiÃ³n completa) */}
          {!loadingLicense &&
            licenseStatus &&
            shouldShowLicenseNotification(licenseStatus) &&
            profile?.role !== "admin" && (
              <div className="mb-6">
                <LicenseNotification licenseStatus={licenseStatus} />
              </div>
            )}

          {/* Hero stat de admin (cuando es admin sin organizaciÃ³n) */}
          {isAdminWithoutOrg && (
            <Card className="relative mb-6 overflow-hidden p-5 lg:mb-8 lg:p-6">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(99,179,255,0.18), transparent 70%)",
                }}
              />
              <div className="relative">
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-muted">
                  Resumen del sistema
                </div>
                <div className="mt-1 text-sm font-semibold text-foreground-muted">
                  Vista general de la plataforma
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <AdminStat
                    label="Organizaciones"
                    value={adminCounts?.organizations ?? 0}
                    icon={Building2}
                    tone="info"
                  />
                  <AdminStat
                    label="Usuarios"
                    value={adminCounts?.users ?? 0}
                    icon={Users}
                    tone="primary"
                  />
                  <AdminStat
                    label="Errores hoy"
                    value={errorStats?.errors_today ?? 0}
                    icon={AlertTriangle}
                    tone="warning"
                  />
                  <AdminStat
                    label="Sin resolver"
                    value={errorStats?.unresolved_errors ?? 0}
                    icon={AlertTriangle}
                    tone="danger"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Hero stat (solo cuando hay org) */}
          {profile?.organization_id && (
            <Card className="relative mb-6 overflow-hidden p-5 lg:mb-8 lg:p-6">
              {/* Decorative radial */}
              <div
                aria-hidden
                className="pointer-events-none absolute -right-12 -top-12 h-52 w-52 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(34,197,94,0.16), transparent 70%)",
                }}
              />
              <div className="relative">
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-muted">
                  Hoy
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold leading-none tracking-tighter text-foreground sm:text-5xl">
                    {stats.total}
                  </span>
                  <span className="text-sm font-semibold text-foreground-muted">
                    turnos
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MiniStat
                    label="Confirmados"
                    value={stats.confirmed}
                    status="confirmed"
                  />
                  <MiniStat
                    label="Pendientes"
                    value={stats.pending}
                    status="pending"
                  />
                  <MiniStat
                    label="En curso"
                    value={stats.inProgress}
                    status="in_progress"
                  />
                  <MiniStat
                    label="Completados"
                    value={stats.completed}
                    status="completed"
                  />
                </div>
              </div>
            </Card>
          )}

          {/* Sin organizaciÃ³n (no admins) */}
          {!profile?.organization_id && profile?.role !== "admin" && (
            <Card className="mb-6 flex items-start gap-3 border-warning-200 bg-warning-50 p-5 dark:border-warning-900/40 dark:bg-warning-900/20">
              <svg
                className="h-6 w-6 shrink-0 text-warning-600 dark:text-warning-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <h3 className="text-base font-bold text-warning-900 dark:text-warning-100">
                  Sin organizaciÃ³n asignada
                </h3>
                <p className="mt-1 text-sm text-warning-800 dark:text-warning-200">
                  NecesitÃ¡s que un administrador te asigne a una organizaciÃ³n
                  para acceder al sistema de gestiÃ³n de turnos.
                </p>
              </div>
            </Card>
          )}

          {/* Atajos */}
          {visibleShortcuts.length > 0 && (
            <section className="mb-8">
              <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-muted">
                Atajos
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {visibleShortcuts.map((s) => (
                  <ShortcutTile key={s.key} card={s} onClick={() => router.push(s.href)} />
                ))}
              </div>
            </section>
          )}

          {/* PrÃ³ximos turnos */}
          {profile?.organization_id && (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div className="text-[11px] font-bold uppercase tracking-[0.06em] text-foreground-muted">
                  PrÃ³ximos
                </div>
                <button
                  onClick={() => router.push("/dashboard/appointments")}
                  className="text-xs font-semibold text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
                >
                  Ver todos â†’
                </button>
              </div>
              {upcoming.length === 0 ? (
                <Card className="p-8 text-center">
                  <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-foreground-subtle">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div className="mt-3 text-sm font-bold text-foreground">
                    No hay turnos prÃ³ximos hoy
                  </div>
                  <div className="mt-1 text-xs text-foreground-muted">
                    Crea uno o consulta el calendario completo.
                  </div>
                </Card>
              ) : (
                <div className="flex flex-col gap-2">
                  {upcoming.map((a) => (
                    <ApptRow
                      key={a.id}
                      appointment={a}
                      onOpen={() =>
                        router.push(`/dashboard/appointments?id=${a.id}`)
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Local helpers (only used by this page)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function MiniStat({
  label,
  value,
  status,
}: {
  label: string;
  value: number;
  status: AppointmentStatus;
}) {
  return (
    <div
      className={`st-${status} rounded-lg px-3 py-2`}
      style={{ background: "var(--st-bg)" }}
    >
      <div
        className="text-[11px] font-semibold"
        style={{ color: "var(--st-cb)" }}
      >
        {label}
      </div>
      <div
        className="mt-0.5 text-xl font-extrabold leading-none"
        style={{ color: "var(--st-cb)" }}
      >
        {value}
      </div>
    </div>
  );
}

function AdminStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: "info" | "primary" | "warning" | "danger";
}) {
  const toneStyles: Record<typeof tone, string> = {
    info: "bg-info-50 text-info-700 dark:bg-info-900/20 dark:text-info-400",
    primary:
      "bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400",
    warning:
      "bg-warning-50 text-warning-700 dark:bg-warning-900/20 dark:text-warning-400",
    danger:
      "bg-danger-50 text-danger-700 dark:bg-danger-900/20 dark:text-danger-400",
  };
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2.5">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${toneStyles[tone]}`}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-foreground-muted">
            {label}
          </div>
          <div className="text-lg font-extrabold leading-none text-foreground">
            {value}
          </div>
        </div>
      </div>
    </div>
  );
}

function ShortcutTile({
  card,
  onClick,
}: {
  card: ShortcutCard;
  onClick: () => void;
}) {
  const Icon = card.Icon;
  return (
    <button
      onClick={onClick}
      className={`${card.mesh} flex min-h-28 flex-col justify-between gap-4 rounded-2xl p-4 text-left text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md active:translate-y-0`}
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <div className="text-[15px] font-bold leading-tight">{card.title}</div>
        <div className="mt-0.5 text-[11px] text-white/85">
          {card.subtitle}
        </div>
      </div>
    </button>
  );
}
