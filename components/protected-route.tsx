"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

// Timeout máximo para la verificación de ruta protegida (15 segundos)
// Este es un fallback adicional al timeout del AuthContext
const PROTECTED_ROUTE_TIMEOUT_MS = 15000;

interface ProtectedRouteProps {
  children: ReactNode;
  redirectTo?: string;
}

/**
 * Componente para proteger rutas que requieren autenticación
 * Redirige a /login si el usuario no está autenticado
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
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  // Manejar redirección de forma segura
  const handleRedirect = useCallback(() => {
    if (!isRedirecting && isMountedRef.current) {
      setIsRedirecting(true);
      router.push(redirectTo);
    }
  }, [router, redirectTo, isRedirecting]);

  // Timeout de seguridad para evitar quedarse colgado indefinidamente
  useEffect(() => {
    isMountedRef.current = true;

    if (loading && !timedOut) {
      timeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          console.warn("ProtectedRoute: verification timeout reached");
          setTimedOut(true);
        }
      }, PROTECTED_ROUTE_TIMEOUT_MS);
    }

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [loading, timedOut]);

  // Limpiar timeout cuando loading termine
  useEffect(() => {
    if (!loading && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [loading]);

  // Manejar redirección cuando no hay usuario
  useEffect(() => {
    // Si no está loading Y no hay usuario, O si hubo timeout y no hay usuario, redirigir
    if ((!loading && !user) || (timedOut && !user)) {
      handleRedirect();
    }
  }, [user, loading, timedOut, handleRedirect]);

  // Mostrar loading mientras verifica auth (solo si no ha expirado el timeout y no está redirigiendo)
  if ((loading || isRedirecting) && !timedOut) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
          <p className="text-sm text-foreground-muted">
            {isRedirecting ? "Redirigiendo..." : "Verificando autenticación..."}
          </p>
        </div>
      </div>
    );
  }

  // Si hubo timeout y hay usuario, mostrar el contenido de todas formas
  // (el perfil podría no estar cargado completamente pero al menos tiene sesión)
  if (timedOut && user) {
    return <>{children}</>;
  }

  // No mostrar nada si no está autenticado (mientras redirige)
  if (!user) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
          <p className="text-sm text-foreground-muted">Redirigiendo...</p>
        </div>
      </div>
    );
  }

  // Usuario autenticado, mostrar contenido
  return <>{children}</>;
}
