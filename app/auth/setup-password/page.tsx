"use client";

import { Logo } from "@/components/ui";
import { createClient } from "@/utils/supabase/client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Logger } from "@/utils/logger";

// Timeout para verificaciÃ³n de sesiÃ³n (10 segundos)
const SESSION_CHECK_TIMEOUT_MS = 10000;

export default function SetupPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const hasChecked = useRef(false);

  // Memoizar el cliente de Supabase
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Verificar que el usuario tenga una sesiÃ³n activa
    const checkSession = async () => {
      if (hasChecked.current) return;
      hasChecked.current = true;

      // Timeout de seguridad
      const timeoutId = setTimeout(() => {
        console.warn("Session check timeout - redirecting to login");
        window.location.href = "/login";
      }, SESSION_CHECK_TIMEOUT_MS);

      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        clearTimeout(timeoutId);

        if (sessionError) {
          void Logger.error("Error checking session:", sessionError);
          window.location.href = "/login";
          return;
        }

        if (!session) {
          // Si no hay sesiÃ³n, redirigir al login
          window.location.href = "/login";
          return;
        }

        setUserEmail(session.user.email || null);
        setCheckingSession(false);
      } catch (err) {
        clearTimeout(timeoutId);
        void Logger.error("Error in session check:", err);
        window.location.href = "/login";
      }
    };

    checkSession();
  }, [supabase]);

  const handleSetupPassword = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validar que las contraseÃ±as coincidan
    if (password !== confirmPassword) {
      setError("Las contraseÃ±as no coinciden");
      setLoading(false);
      return;
    }

    // Validar longitud mÃ­nima
    if (password.length < 6) {
      setError("La contraseÃ±a debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      // Obtener informaciÃ³n del usuario para verificar metadata
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Error al obtener informaciÃ³n del usuario");
        setLoading(false);
        return;
      }

      // Actualizar la contraseÃ±a del usuario (usando el cliente memoizado)
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Si el usuario fue invitado a una organizaciÃ³n, asignarla al perfil
      // Esto es un respaldo en caso de que el trigger no haya funcionado
      const invitedOrgId = user.user_metadata?.invited_to_organization_id;
      if (invitedOrgId) {
        try {
          const { error: profileUpdateError } = await supabase
            .from("user_profiles")
            .update({ organization_id: invitedOrgId })
            .eq("user_id", user.id)
            .is("organization_id", null); // Solo actualizar si no tiene organizaciÃ³n

          if (profileUpdateError) {
            console.warn(
              "Error updating profile with organization_id:",
              profileUpdateError
            );
            // No fallar el flujo si esto falla, el trigger deberÃ­a haberlo hecho
          }
        } catch (err) {
          console.warn("Error assigning organization:", err);
          // No fallar el flujo
        }
      }

      // ContraseÃ±a configurada exitosamente, redirigir al dashboard
      window.location.href = "/dashboard";
    } catch {
      setError("Error al configurar la contraseÃ±a. Intenta nuevamente.");
      setLoading(false);
    }
  };

  // Mostrar pantalla de carga mientras verificamos la sesiÃ³n
  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
        <div className="flex w-full max-w-md flex-col items-center space-y-4 text-center">
          <Logo size={48} priority />
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-black dark:border-zinc-700 dark:border-t-zinc-50"></div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Verificando sesiÃ³n...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Logo size={56} priority className="mb-4" />
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
            Â¡Bienvenido a Turno Flash!
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Configura tu contraseÃ±a para completar tu registro
          </p>
          {userEmail && (
            <p className="mt-1 text-sm font-medium text-zinc-700 dark:text-zinc-300">
              {userEmail}
            </p>
          )}
        </div>

        <div className="rounded-lg bg-white p-8 shadow-sm dark:bg-zinc-900">
          <form onSubmit={handleSetupPassword} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Nueva contraseÃ±a
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 sm:text-sm"
                placeholder="MÃ­nimo 6 caracteres"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Confirmar contraseÃ±a
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 sm:text-sm"
                placeholder="Repite tu contraseÃ±a"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {loading ? "Configurando..." : "Configurar contraseÃ±a"}
            </button>

            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Una vez configurada tu contraseÃ±a, podrÃ¡s iniciar sesiÃ³n con tu
              correo y contraseÃ±a
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
