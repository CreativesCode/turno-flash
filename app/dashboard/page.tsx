"use client";

import {
  LicenseNotification,
  LicenseNotificationBanner,
} from "@/components/license-notification";
import { ProtectedRoute } from "@/components/protected-route";
import { useAuth } from "@/contexts/auth-context";
import { LicenseStatusResult } from "@/types/organization";
import {
  canUseApplication,
  getMyOrganizationLicenseStatus,
  shouldShowLicenseNotification,
} from "@/utils/license";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const [licenseStatus, setLicenseStatus] =
    useState<LicenseStatusResult | null>(null);
  const [loadingLicense, setLoadingLicense] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  // Cargar estado de licencia al montar el componente
  useEffect(() => {
    const loadLicenseStatus = async () => {
      try {
        // Solo verificar licencia si el usuario tiene una organización
        // Los admins sin organización no necesitan verificar licencia
        if (!profile?.organization_id && profile?.role !== "admin") {
          setLoadingLicense(false);
          return;
        }

        const status = await getMyOrganizationLicenseStatus();
        setLicenseStatus(status);

        // Verificar si el usuario está bloqueado
        if (status && !canUseApplication(status)) {
          setIsBlocked(true);
        }
      } catch (error) {
        console.error("Error loading license status:", error);
      } finally {
        setLoadingLicense(false);
      }
    };

    if (profile) {
      loadLicenseStatus();
    }
  }, [profile]);

  // Si está bloqueado por licencia expirada, mostrar pantalla de bloqueo
  if (isBlocked && profile?.role !== "admin") {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-zinc-50 dark:bg-black">
          {licenseStatus && (
            <LicenseNotificationBanner licenseStatus={licenseStatus} />
          )}
          <div className="flex min-h-screen items-center justify-center px-4">
            <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-lg dark:bg-zinc-900">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
                <span className="text-3xl">🚫</span>
              </div>
              <h1 className="mt-6 text-2xl font-bold text-black dark:text-zinc-50">
                Acceso Bloqueado
              </h1>
              <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
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
              <button
                onClick={() => signOut().then(() => router.push("/login"))}
                className="mt-6 w-full rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        {/* Banner de notificación de licencia en la parte superior */}
        {licenseStatus && shouldShowLicenseNotification(licenseStatus) && (
          <LicenseNotificationBanner licenseStatus={licenseStatus} />
        )}

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-black dark:text-zinc-50">
                Panel de Control
              </h1>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Bienvenido, {profile?.full_name || profile?.email || "Usuario"}
              </p>
            </div>
            <div className="flex gap-3">
              {profile?.role === "admin" && (
                <>
                  <button
                    onClick={() => router.push("/dashboard/users")}
                    className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Gestión de usuarios
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/organizations")}
                    className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                  >
                    Gestión de organizaciones
                  </button>
                  <button
                    onClick={() => router.push("/dashboard/invite")}
                    className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Invitar usuarios
                  </button>
                </>
              )}
              <button
                onClick={() => signOut().then(() => router.push("/login"))}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Cerrar sesión
              </button>
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

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                Información del Usuario
              </h2>
              <dl className="mt-4 space-y-2">
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Email
                  </dt>
                  <dd className="mt-1 text-sm text-black dark:text-zinc-50">
                    {profile?.email || "N/A"}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                    Rol
                  </dt>
                  <dd className="mt-1 text-sm text-black dark:text-zinc-50">
                    <span className="inline-flex rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                      {profile?.role || "staff"}
                    </span>
                  </dd>
                </div>
                {profile?.organization_id && (
                  <div>
                    <dt className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
                      Organización
                    </dt>
                    <dd className="mt-1 text-sm text-black dark:text-zinc-50">
                      {profile.organization_id}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
              <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
                Estado
              </h2>
              <div className="mt-4">
                <span
                  className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                    profile?.is_active
                      ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                      : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                  }`}
                >
                  {profile?.is_active ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
            <h2 className="text-lg font-semibold text-black dark:text-zinc-50">
              Próximos pasos
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Esta es una página de ejemplo del dashboard. Aquí puedes agregar
              las funcionalidades del panel del dueño según las indicaciones del
              proyecto.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
