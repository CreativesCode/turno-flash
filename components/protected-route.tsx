"use client";

import { useAuth } from "@/contexts/auth-context";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect, useRef, useState } from "react";

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Timeout de seguridad para evitar quedarse colgado indefinidamente
  useEffect(() => {
    if (loading && !timedOut) {
      timeoutRef.current = setTimeout(() => {
        console.warn("ProtectedRoute: verification timeout reached");
        setTimedOut(true);
      }, PROTECTED_ROUTE_TIMEOUT_MS);
    }

    return () => {
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

  useEffect(() => {
    // Si no está loading Y no hay usuario, O si hubo timeout, redirigir
    if ((!loading && !user) || (timedOut && !user)) {
      router.push(redirectTo);
    }
  }, [user, loading, router, redirectTo, timedOut]);

  // Mostrar loading mientras verifica auth (solo si no ha expirado el timeout)
  if (loading && !timedOut) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-zinc-900 dark:border-zinc-700 dark:border-t-zinc-100"></div>
          <p className="text-sm text-foreground-muted">
            Verificando autenticación...
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
    return null;
  }

  // Usuario autenticado, mostrar contenido
  return <>{children}</>;
}
