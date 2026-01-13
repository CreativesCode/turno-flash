"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useRef, useState } from "react";

export default function AuthCallbackPage() {
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Procesando autenticación...");
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Evitar procesar múltiples veces
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      const supabase = createClient();

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
            console.error("Error setting session:", sessionError);
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
            console.error("Error exchanging code:", exchangeError);
            // Si el error es de PKCE, dar instrucciones más claras
            if (
              exchangeError.message.includes("PKCE") ||
              exchangeError.message.includes("code verifier")
            ) {
              setError(
                "El enlace de invitación ha expirado o ya fue usado. Por favor, solicita una nueva invitación."
              );
            } else {
              setError(exchangeError.message);
            }
            return;
          }

          session = data.session;
        }

        if (!session) {
          setError("No se encontraron parámetros de autenticación válidos");
          return;
        }

        console.log("Session established for:", session.user.email);

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
        console.error("Error in callback:", err);
        setError("Error al procesar la autenticación");
      }
    };

    handleCallback();
  }, []);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-2xl font-bold text-red-600 dark:text-red-400">
            Error de autenticación
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">{error}</p>
          <a
            href="/login"
            className="inline-block rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
          >
            Volver al login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-md space-y-4 text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-black dark:border-zinc-700 dark:border-t-zinc-50"></div>
        <p className="text-zinc-600 dark:text-zinc-400">{status}</p>
      </div>
    </div>
  );
}
