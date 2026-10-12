"use client";

import { Logo } from "@/components/ui";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Logger } from "@/utils/logger";

// Timeout para el callback de autenticación (30 segundos)
const CALLBACK_TIMEOUT_MS = 30000;

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Procesando autenticación...");
  const hasProcessed = useRef(false);

  // Memoizar el cliente de Supabase
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const handleCallback = async () => {
      // Evitar procesar múltiples veces
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      // Timeout de seguridad
      const timeoutId = setTimeout(() => {
        console.warn("Auth callback timeout reached");
        setError(
          "La autenticación está tardando demasiado. Por favor, intenta nuevamente."
        );
      }, CALLBACK_TIMEOUT_MS);

      try {
        // Obtener parámetros de la URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");

        // Obtener parámetros del hash
        const hashParams = new URLSearchParams(
          window.location.hash.substring(1)
        );

        // Obtener el tipo de autenticación
        const urlType = urlParams.get("type");
        const hashType = hashParams.get("type");
        const type = urlType || hashType;

        console.log("Auth callback - type:", type);
        console.log("Auth callback - has code:", !!code);
        console.log(
          "Auth callback - has hash tokens:",
          !!hashParams.get("access_token")
        );

        let session = null;

        // Primero intentar con tokens en el hash (flujo implícito/invitaciones)
        // Esto tiene prioridad porque las invitaciones vía Admin API usan este flujo
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken && refreshToken) {
          console.log("Using implicit flow (tokens in hash)");
          setStatus("Estableciendo sesión...");
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            clearTimeout(timeoutId);
            void Logger.error("Error setting session:", sessionError);
            setError(sessionError.message);
            return;
          }

          session = data.session;
        } else if (code) {
          // Flujo PKCE - intercambiar código por sesión
          // Solo usar si no hay tokens en el hash
          console.log("Using PKCE flow (code exchange)");
          setStatus("Verificando código...");
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            clearTimeout(timeoutId);
            void Logger.error("Error exchanging code:", exchangeError);
            // Si el error es de PKCE, dar instrucciones más claras
            if (
              exchangeError.message.includes("PKCE") ||
              exchangeError.message.includes("code verifier")
            ) {
              setError(
                "El enlace expiró o ya fue usado. Pide uno nuevo."
              );
            } else {
              setError(exchangeError.message);
            }
            return;
          }

          session = data.session;
        }

        if (!session) {
          clearTimeout(timeoutId);
          setError("No se encontraron parámetros de autenticación válidos");
          return;
        }

        // Limpiar timeout - autenticación exitosa
        clearTimeout(timeoutId);
        console.log("Session established for:", session.user.email);

        // "¿Olvidaste tu contraseña?": choose a new one (P1-28)
        if (type === "recovery") {
          setStatus("Redirigiendo...");
          window.location.href = "/auth/setup-password?mode=recovery";
          return;
        }

        // Si es un magic link de invitación, redirigir a configurar contraseña
        // También verificar si el usuario no tiene contraseña configurada (invited user)
        if (type === "magiclink" || type === "invite" || type === "signup") {
          setStatus("Redirigiendo a configurar contraseña...");
          console.log("Redirecting to setup-password (invitation flow)");
          // Usar window.location para evitar conflictos con el router de React
          window.location.href = "/auth/setup-password";
          return;
        }

        // De lo contrario, redirigir al dashboard
        setStatus("Redirigiendo al dashboard...");
        console.log("Redirecting to dashboard");
        window.location.href = "/dashboard";
      } catch (err) {
        clearTimeout(timeoutId);
        void Logger.error("Error in callback:", err);
        setError("Error al procesar la autenticación");
      }
    };

    handleCallback();
  }, [supabase]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex w-full max-w-md flex-col items-center space-y-4 text-center">
          <Logo size={48} priority />
          <h1 className="text-title font-semibold text-danger-600 dark:text-danger-400">
            Error de autenticación
          </h1>
          <p className="text-foreground-muted">{error}</p>
          <a
            href="/login"
            className="inline-flex h-11 items-center rounded-control bg-primary px-[18px] text-body font-semibold text-primary-foreground hover:brightness-95"
          >
            Volver al login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="flex w-full max-w-md flex-col items-center space-y-4 text-center">
        <Logo size={48} priority />
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-2 border-t-foreground"></div>
        <p className="text-foreground-muted">{status}</p>
      </div>
    </div>
  );
}
