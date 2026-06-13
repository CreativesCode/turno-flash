"use client";

import {
  LicenseNotification,
  LicenseNotificationBanner,
} from "@/components/license-notification";
import { Button, Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useLicense } from "@/hooks/useLicense";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode } from "react";

// Rutas que siguen accesibles aun con la licencia vencida, para que el usuario
// pueda renovar o cerrar su cuenta sin quedar encerrado.
const ALLOWED_WHILE_BLOCKED = ["/dashboard/subscription", "/dashboard/account"];

/**
 * Compuerta de licencia para todo el dashboard. Si la organización del usuario
 * tiene el trial/licencia vencido (sin acceso usable), reemplaza el contenido
 * por una pantalla de bloqueo en TODAS las subrutas, no solo el home.
 *
 * Los admins nunca se bloquean. Mientras se resuelve el estado, se renderiza el
 * contenido normal (el enforcement real vive en la base, migración 027, así que
 * no hay riesgo de que escriban durante ese instante).
 */
export function LicenseGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { profile, signOut } = useAuth();
  const { licenseStatus, isBlocked, loading } = useLicense();

  const isAllowedPath = ALLOWED_WHILE_BLOCKED.some((p) =>
    pathname?.startsWith(p)
  );

  const shouldBlock =
    !loading &&
    isBlocked &&
    !isAllowedPath &&
    profile?.role !== "admin" &&
    !!profile?.organization_id;

  if (!shouldBlock) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-background">
      {licenseStatus && (
        <LicenseNotificationBanner licenseStatus={licenseStatus} />
      )}
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md p-8 text-center shadow-lg">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-danger-100 dark:bg-danger-900/20">
            <span className="text-3xl">🚫</span>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-foreground">
            Acceso Bloqueado
          </h1>
          <p className="mt-4 text-sm text-foreground-muted">
            La licencia de tu organización ha expirado. Renová tu suscripción
            para volver a gestionar turnos, clientes y servicios.
          </p>
          {licenseStatus && (
            <div className="mt-6">
              <LicenseNotification
                licenseStatus={licenseStatus}
                dismissible={false}
              />
            </div>
          )}
          <div className="mt-6 flex flex-col gap-3">
            <Button
              variant="mesh-primary"
              size="md"
              className="w-full"
              onClick={() => router.push("/dashboard/subscription")}
            >
              Renovar suscripción
            </Button>
            <Button
              variant="danger"
              size="md"
              className="w-full"
              onClick={() => signOut().then(() => router.push("/login"))}
            >
              Cerrar sesión
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
