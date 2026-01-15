"use client";

import {
  LicenseNotification,
  LicenseNotificationBanner,
} from "@/components/license-notification";
import { PageMetadata } from "@/components/page-metadata";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { LicenseStatusResult } from "@/types/organization";
import {
  canUseApplication,
  getMyOrganizationLicenseStatus,
  shouldShowLicenseNotification,
} from "@/utils/license";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

export default function DashboardPage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [licenseStatus, setLicenseStatus] =
    useState<LicenseStatusResult | null>(null);
  const [loadingLicense, setLoadingLicense] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  // Cargar estado de licencia y nombre de organización al montar el componente
  useEffect(() => {
    // Flag para controlar si el componente sigue montado
    let isMounted = true;

    const loadLicenseStatus = async () => {
      try {
        // Solo verificar licencia si el usuario tiene una organización
        // Los admins sin organización no necesitan verificar licencia
        if (!profile?.organization_id && profile?.role !== "admin") {
          if (isMounted) setLoadingLicense(false);
          return;
        }

        const status = await getMyOrganizationLicenseStatus();

        // Verificar si el componente sigue montado antes de actualizar estado
        if (!isMounted) return;

        setLicenseStatus(status);

        // Verificar si el usuario está bloqueado
        if (status && !canUseApplication(status)) {
          setIsBlocked(true);
        }
      } catch (error) {
        console.error("Error loading license status:", error);
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

        // Verificar si el componente sigue montado antes de actualizar estado
        if (!isMounted) return;

        if (error) {
          console.error("Error loading organization name:", error);
          setOrganizationName(null);
        } else {
          setOrganizationName(data?.name || null);
        }
      } catch (error) {
        if (!isMounted) return;
        console.error("Error loading organization name:", error);
        setOrganizationName(null);
      }
    };

    if (profile) {
      loadLicenseStatus();
      loadOrganizationName();
    }

    // Cleanup: marcar como desmontado para evitar actualizaciones de estado
    return () => {
      isMounted = false;
    };
  }, [profile, supabase]);

  // Si estรก bloqueado por licencia expirada, mostrar pantalla de bloqueo
  if (isBlocked && profile?.role !== "admin") {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          {licenseStatus && (
            <LicenseNotificationBanner licenseStatus={licenseStatus} />
          )}
          <div className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md rounded-lg bg-surface p-8 text-center shadow-lg">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-100 dark:bg-danger-900/20">
                <span className="text-3xl">๐��ซ</span>
              </div>
              <h1 className="mt-6 text-2xl font-bold text-foreground">
                Acceso Bloqueado
              </h1>
              <p className="mt-4 text-sm text-foreground-muted">
                La licencia de tu organizaciรณn ha expirado. Por favor, contacta
                al administrador para renovarla y continuar usando la
                aplicaciรณn.
              </p>
              {licenseStatus && (
                <div className="mt-6">
                  <LicenseNotification
                    licenseStatus={licenseStatus}
                    dismissible={false}
                  />
                </div>
              )}
              <button
                onClick={() => signOut().then(() => router.push("/login"))}
                className="mt-6 w-full rounded-md bg-danger px-4 py-2 text-sm font-medium text-danger-foreground transition-colors hover:bg-danger-700 focus:outline-none focus:ring-2 focus:ring-danger-500 focus:ring-offset-2"
              >
                Cerrar sesiรณn
              </button>
            </div>
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
        {/* Banner de notificaciรณn de licencia en la parte superior */}
        {licenseStatus && shouldShowLicenseNotification(licenseStatus) && (
          <LicenseNotificationBanner licenseStatus={licenseStatus} />
        )}

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-2">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Panel de Control
              </h1>
              <p className="mt-2 text-foreground-muted">
                Bienvenido, {profile?.full_name || profile?.email || "Usuario"}
              </p>
              {profile?.role && (
                <span className="mt-2 inline-flex items-center rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                  Rol:{" "}
                  {profile.role === "admin"
                    ? "Administrador"
                    : profile.role === "owner"
                    ? "Dueño"
                    : "Staff"}
                </span>
              )}
            </div>
          </div>

          {/* Notificación de licencia (versión completa) */}
          {!loadingLicense &&
            licenseStatus &&
            shouldShowLicenseNotification(licenseStatus) &&
            profile?.role !== "admin" && (
              <div className="mb-6">
                <LicenseNotification licenseStatus={licenseStatus} />
              </div>
            )}

          {/* Panel de administraciรณn - Solo para admins */}
          {profile?.role === "admin" && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Administración
              </h2>
              <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
                {/* Gestión de usuarios */}
                <button
                  onClick={() => router.push("/dashboard/users")}
                  className="rounded-lg bg-linear-to-br from-success-500 to-success-600 p-6 text-left shadow-sm transition-all hover:shadow-md hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Gestión de usuarios
                      </p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        Administrar
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/20 p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-green-100">
                    Administrar usuarios del sistema
                  </p>
                </button>

                {/* Gestión de organizaciones */}
                <button
                  onClick={() => router.push("/dashboard/organizations")}
                  className="rounded-lg bg-linear-to-br from-primary-500 to-primary-600 p-6 text-left shadow-sm transition-all hover:shadow-md hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Gestión de organizaciones
                      </p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        Administrar
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/20 p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-white/80">
                    Gestionar organizaciones y licencias
                  </p>
                </button>

                {/* Invitar usuarios */}
                <button
                  onClick={() => router.push("/dashboard/invite")}
                  className="rounded-lg bg-linear-to-br from-secondary-500 to-secondary-600 p-6 text-left shadow-sm transition-all hover:shadow-md hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Invitar usuarios
                      </p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        Invitar
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/20 p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-white/80">
                    Enviar invitaciones a nuevos usuarios
                  </p>
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-surface p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">
                Información del Usuario
              </h2>
              <dl className="mt-4 space-y-2">
                <div>
                  <dt className="text-sm font-medium text-foreground-muted">
                    Email
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    {profile?.email || "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-foreground-muted">
                    Rol
                  </dt>
                  <dd className="mt-1 text-sm text-foreground">
                    <span className="inline-flex rounded-full bg-muted px-2 py-1 text-xs font-medium text-foreground">
                      {profile?.role || "staff"}
                    </span>
                  </dd>
                </div>
                {profile?.organization_id && (
                  <div>
                    <dt className="text-sm font-medium text-foreground-muted">
                      Organización
                    </dt>
                    <dd className="mt-1 text-sm text-foreground">
                      {organizationName || profile.organization_id}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-lg bg-surface p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Estado</h2>
              <div className="mt-4">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    profile?.is_active
                      ? "bg-success-100 text-success-800"
                      : "bg-danger-100 text-danger-800 dark:bg-danger-900/20 dark:text-danger-400"
                  }`}
                >
                  {profile?.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>

          {/* Sistema de Gestión de Turnos */}
          {profile?.organization_id && (
            <div className="mt-8">
              <h2 className="text-xl font-semibold text-foreground mb-4">
                Gestión de Turnos
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {/* Turnos - Todos los roles con organización */}
                <button
                  onClick={() => router.push("/dashboard/appointments")}
                  className="rounded-lg bg-linear-to-br from-info-500 to-info-600 p-6 text-left shadow-sm transition-all hover:shadow-md hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">Turnos</p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        {profile?.role === "staff" ? "Ver" : "Gestionar"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/20 p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-white/80">
                    {profile?.role === "staff"
                      ? "Ver agenda de citas"
                      : "Ver y crear citas de clientes"}
                  </p>
                </button>

                {/* Clientes - Owner y Admin pueden gestionar, Staff solo ver */}
                <button
                  onClick={() => router.push("/dashboard/customers")}
                  className="rounded-lg bg-linear-to-br from-success-500 to-success-600 p-6 text-left shadow-sm transition-all hover:shadow-md hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">Clientes</p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        {profile?.role === "staff" ? "Ver" : "Gestionar"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/20 p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-white/80">
                    {profile?.role === "staff"
                      ? "Ver información de clientes"
                      : "Administrar base de clientes"}
                  </p>
                </button>

                {/* Servicios - Solo Owner y Admin */}
                {(profile?.role === "admin" || profile?.role === "owner") && (
                  <button
                    onClick={() => router.push("/dashboard/services")}
                    className="rounded-lg bg-linear-to-br from-primary-700 to-primary-800 p-6 text-left shadow-sm transition-all hover:shadow-md hover:scale-105"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Servicios
                        </p>
                        <p className="mt-2 text-2xl font-bold text-white">
                          Gestionar
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/20 p-3">
                        <svg
                          className="h-6 w-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-white/80">
                      Configurar servicios ofrecidos
                    </p>
                  </button>
                )}

                {/* Staff - Solo Owner y Admin */}
                {(profile?.role === "admin" || profile?.role === "owner") && (
                  <button
                    onClick={() => router.push("/dashboard/staff")}
                    className="rounded-lg bg-linear-to-br from-warning-500 to-warning-600 p-6 text-left shadow-sm transition-all hover:shadow-md hover:scale-105"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">
                          Profesionales
                        </p>
                        <p className="mt-2 text-2xl font-bold text-white">
                          Gestionar
                        </p>
                      </div>
                      <div className="rounded-lg bg-white/20 p-3">
                        <svg
                          className="h-6 w-6 text-white"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-white/80">
                      Administrar equipo de trabajo
                    </p>
                  </button>
                )}

                {/* Recordatorios - Todos los roles */}
                <button
                  onClick={() => router.push("/dashboard/reminders")}
                  className="rounded-lg bg-linear-to-br from-secondary-500 to-secondary-600 p-6 text-left shadow-sm transition-all hover:shadow-md hover:scale-105"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">
                        Recordatorios
                      </p>
                      <p className="mt-2 text-2xl font-bold text-white">
                        Enviar
                      </p>
                    </div>
                    <div className="rounded-lg bg-white/20 p-3">
                      <svg
                        className="h-6 w-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                        />
                      </svg>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-white/80">
                    Enviar recordatorios por WhatsApp
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Mensaje para usuarios sin organización */}
          {!profile?.organization_id && profile?.role !== "admin" && (
            <div className="mt-8 rounded-lg bg-warning-50 p-6 dark:bg-warning-900/20">
              <div className="flex items-start gap-3">
                <svg
                  className="h-6 w-6 text-warning-600 dark:text-warning-400"
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
                  <h3 className="text-lg font-semibold text-warning-900 dark:text-warning-100">
                    Sin Organización Asignada
                  </h3>
                  <p className="mt-2 text-sm text-warning-800 dark:text-warning-200">
                    Necesitas que un administrador te asigne a una organización
                    para acceder al sistema de gestión de turnos.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Sección de acceso rápido */}
          <div className="mt-8 rounded-lg bg-surface p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">
              Acceso Rápido
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              Accede rápidamente a las funcionalidades principales de tu
              negocio.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {profile?.organization_id && (
                <>
                  <button
                    onClick={() => router.push("/dashboard/appointments")}
                    className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted"
                  >
                    <div className="rounded-lg bg-info-100 p-2">
                      <svg
                        className="h-5 w-5 text-info-600 dark:text-info-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Nuevo Turno</p>
                      <p className="text-xs text-foreground-muted">
                        Crear cita para cliente
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push("/dashboard/customers")}
                    className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted"
                  >
                    <div className="rounded-lg bg-green-100 p-2">
                      <svg
                        className="h-5 w-5 text-green-600 dark:text-green-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        Nuevo Cliente
                      </p>
                      <p className="text-xs text-foreground-muted">
                        Agregar cliente nuevo
                      </p>
                    </div>
                  </button>

                  <button
                    onClick={() => router.push("/dashboard/appointments")}
                    className="flex items-center gap-3 rounded-lg border border-border p-4 text-left transition-colors hover:bg-muted"
                  >
                    <div className="rounded-lg bg-primary-100 p-2">
                      <svg
                        className="h-5 w-5 text-primary-600 dark:text-primary-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        Ver Calendario
                      </p>
                      <p className="text-xs text-foreground-muted">
                        Agenda completa
                      </p>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
