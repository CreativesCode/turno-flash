"use client";

import { Logo } from "@/components/ui";
import { createClient } from "@/utils/supabase/client";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Logger } from "@/utils/logger";

// Timeout para verificación de sesión (10 segundos)
const SESSION_CHECK_TIMEOUT_MS = 10000;

export default function SetupPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const hasChecked = useRef(false);
  // Coming from "¿Olvidaste tu contraseña?" rather than an invitation
  const [isRecovery] = useState(
    () =>
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("mode") === "recovery"
  );

  // Memoizar el cliente de Supabase
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    // Verificar que el usuario tenga una sesión activa
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
          // Si no hay sesión, redirigir al login
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

    // Validar que las contraseñas coincidan
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    // Validar longitud mínima
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      // Obtener información del usuario para verificar metadata
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("Error al obtener información del usuario");
        setLoading(false);
        return;
      }

      // Actualizar la contraseña del usuario (usando el cliente memoizado)
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
      }

      // Si el usuario fue invitado a una organización, asignarla al perfil
      // Esto es un respaldo en caso de que el trigger no haya funcionado
      const invitedOrgId = user.user_metadata?.invited_to_organization_id;
      if (invitedOrgId) {
        try {
          const { error: profileUpdateError } = await supabase
            .from("user_profiles")
            .update({ organization_id: invitedOrgId })
            .eq("user_id", user.id)
            .is("organization_id", null); // Solo actualizar si no tiene organización

          if (profileUpdateError) {
            console.warn(
              "Error updating profile with organization_id:",
              profileUpdateError
            );
            // No fallar el flujo si esto falla, el trigger debería haberlo hecho
          }
        } catch (err) {
          console.warn("Error assigning organization:", err);
          // No fallar el flujo
        }
      }

      // Contraseña configurada exitosamente, redirigir al dashboard
      window.location.href = "/dashboard";
    } catch {
      setError("Error al configurar la contraseña. Intenta nuevamente.");
      setLoading(false);
    }
  };

  // Mostrar pantalla de carga mientras verificamos la sesión
  if (checkingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="flex w-full max-w-md flex-col items-center space-y-4 text-center">
          <Logo size={48} priority />
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-2 border-t-foreground"></div>
          <p className="text-foreground-muted">
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center text-center">
          <Logo size={56} priority className="mb-4" />
          <h1 className="font-display text-[40px] leading-[1.05] text-foreground">
            {isRecovery ? "Elige una contraseña nueva" : "¡Te damos la bienvenida a Turno Flash!"}
          </h1>
          <p className="mt-2 text-sm text-foreground-muted">
            {isRecovery
              ? "La usarás desde ahora para entrar con tu email"
              : "Configura tu contraseña para completar tu registro"}
          </p>
          {userEmail && (
            <p className="mt-1 text-sm font-medium text-foreground-muted">
              {userEmail}
            </p>
          )}
        </div>

        <div className="rounded-card border border-border bg-surface p-8 shadow-card">
          <form onSubmit={handleSetupPassword} className="space-y-6">
            <div>
              <label
                htmlFor="password"
                className="block text-meta font-medium text-foreground-muted"
              >
                Nueva contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5 block w-full min-h-12 rounded-control border border-border-2 bg-surface px-3.5 py-2.5 text-body text-foreground placeholder:text-foreground-subtle transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-meta font-medium text-foreground-muted"
              >
                Confirmar contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 block w-full min-h-12 rounded-control border border-border-2 bg-surface px-3.5 py-2.5 text-body text-foreground placeholder:text-foreground-subtle transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900"
                placeholder="Repite tu contraseña"
              />
            </div>

            {error && (
              <div className="rounded-card bg-danger-100 p-4 text-meta text-danger-600 dark:bg-danger-900 dark:text-danger-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex h-[54px] w-full cursor-pointer items-center justify-center rounded-[14px] bg-primary px-[22px] text-[16px] font-semibold text-primary-foreground transition-[filter] hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Configurando..." : "Configurar contraseña"}
            </button>

            <p className="text-center text-xs text-foreground-muted">
              Una vez configurada tu contraseña, podrás iniciar sesión con tu
              correo y contraseña
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
