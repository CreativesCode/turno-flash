"use client";

import { Button } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { WifiOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";

// After this long still verifying, offer a manual retry. Never redirect on it:
// on a slow network the session is usually still valid.
const SLOW_CONNECTION_MS = 15000;

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Componente para proteger rutas que requieren autenticación
 * Redirige a /login solo cuando se confirmó que no hay sesión; un fallo de red
 * muestra "Sin conexión" y se reintenta solo.
 *
 * Uso:
 * ```tsx
 * <ProtectedRoute>
 *   <Dashboard />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  redirectTo = "/login",
}: ProtectedRouteProps) {
  const { user, profile, loading, connectionError, retry } = useAuth();
  const router = useRouter();
  const [slow, setSlow] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const signedOut = !loading && !user;
  const ready = !loading && !!user && !!profile;

  useEffect(() => {
    if (signedOut) router.replace(redirectTo);
  }, [signedOut, router, redirectTo]);

  useEffect(() => {
    if (ready || signedOut) return;
    const timer = setTimeout(() => setSlow(true), SLOW_CONNECTION_MS);
    return () => clearTimeout(timer);
  }, [ready, signedOut]);

  if (ready) return <>{children}</>;

  if ((connectionError || slow) && !signedOut) {
    const handleRetry = async () => {
      setRetrying(true);
      await retry();
      setRetrying(false);
    };
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background px-5">
        <div className="flex max-w-xs flex-col items-center text-center">
          <WifiOff className="h-10 w-10 text-foreground-subtle" />
          <h1 className="mt-3 text-lg font-extrabold text-foreground">
            {connectionError ? "Sin conexión" : "Conectando…"}
          </h1>
          <p className="mt-1 text-sm text-foreground-muted">
            Tu sesión sigue abierta. Entrarás solo en cuanto vuelva la
            conexión.
          </p>
          <Button
            variant="soft"
            onClick={() => void handleRetry()}
            disabled={retrying}
            className="mt-4 w-full justify-center"
          >
            {retrying ? "Reintentando…" : "Reintentar"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-background">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
        <p className="text-sm text-foreground-muted">
          {signedOut ? "Redirigiendo..." : "Verificando autenticación..."}
        </p>
      </div>
    </div>
  );
}
