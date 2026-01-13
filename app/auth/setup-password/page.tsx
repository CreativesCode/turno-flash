"use client";

import { createClient } from "@/utils/supabase/client";
import { FormEvent, useEffect, useRef, useState } from "react";

export default function SetupPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const hasChecked = useRef(false);

  useEffect(() => {
    // Verificar que el usuario tenga una sesión activa
    const checkSession = async () => {
      if (hasChecked.current) return;
      hasChecked.current = true;

      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        // Si no hay sesión, redirigir al login
        window.location.href = "/login";
        return;
      }

      setUserEmail(session.user.email || null);
      setCheckingSession(false);
    };

    checkSession();
  }, []);

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
      const supabase = createClient();

      // Actualizar la contraseña del usuario
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });

      if (updateError) {
        setError(updateError.message);
        setLoading(false);
        return;
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
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
        <div className="w-full max-w-md space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-black dark:border-zinc-700 dark:border-t-zinc-50"></div>
          <p className="text-zinc-600 dark:text-zinc-400">
            Verificando sesión...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-black sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-black dark:text-zinc-50">
            ¡Bienvenido a Turno Flash!
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Configura tu contraseña para completar tu registro
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
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 sm:text-sm"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
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
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 sm:text-sm"
                placeholder="Repite tu contraseña"
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
              {loading ? "Configurando..." : "Configurar contraseña"}
            </button>

            <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
              Una vez configurada tu contraseña, podrás iniciar sesión con tu
              correo y contraseña
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
