"use client";

import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

export default function InvitePage() {
  const { profile, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Memoizar el cliente de Supabase para evitar re-renders infinitos
  const supabase = useMemo(() => createClient(), []);

  // Verificar que el usuario sea admin u owner
  useEffect(() => {
    if (
      !authLoading &&
      profile &&
      profile.role !== "admin" &&
      profile.role !== "owner"
    ) {
      router.push("/dashboard");
    }
  }, [profile, authLoading, router]);

  const handleInvite = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Static export: no hay API Routes. Llamamos a la Edge Function directamente.
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        setError("Falta configuración de Supabase (URL/ANON KEY).");
        setLoading(false);
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.access_token) {
        setError("Sesión expirada. Por favor, vuelve a iniciar sesión.");
        setLoading(false);
        return;
      }

      // Asegurar token con forma de JWT (a.b.c). Si no, refrescar sesión.
      let accessToken = session.access_token;
      if (accessToken.split(".").length !== 3) {
        const { data: refreshed, error: refreshError } =
          await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session?.access_token) {
          setError("Sesión expirada. Por favor, vuelve a iniciar sesión.");
          setLoading(false);
          return;
        }
        accessToken = refreshed.session.access_token;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/invite-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email,
          redirectTo: `${window.location.origin}/auth/callback?type=invite`,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() };

      if (!response.ok) {
        console.error("Error inviting user:", data);
        setError(data?.error || "Error al enviar la invitación");
        setLoading(false);
        return;
      }

      if (data?.error) {
        console.error("Error from function:", data.error);
        setError(data.error);
        setLoading(false);
        return;
      }

      setSuccess(
        `Se ha enviado una invitación a ${email}. El usuario podrá hacer clic en el enlace para configurar su contraseña.`
      );
      setEmail(""); // Limpiar el campo
    } catch (err) {
      console.error("Exception:", err);
      setError("Error al enviar la invitación. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Mostrar spinner mientras se carga la autenticación o si no es admin u owner
  if (
    authLoading ||
    !profile ||
    (profile.role !== "admin" && profile.role !== "owner")
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-border border-t-foreground"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground"></h1>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-md bg-muted px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-subtle"
            >
              Volver al dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-surface p-8 shadow-sm border border-border">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground">
              Enviar invitación
            </h2>
            <p className="mt-2 text-sm text-foreground-muted">
              El usuario recibirá un correo con un enlace para configurar su
              contraseña y acceder a la plataforma.
            </p>
          </div>

          <form onSubmit={handleInvite} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                Correo electrónico del nuevo usuario
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground placeholder-foreground-muted shadow-sm focus:border-info-500 focus:outline-none focus:ring-info-500 sm:text-sm"
                placeholder="usuario@ejemplo.com"
              />
            </div>

            {error && (
              <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-secondary-500 px-4 py-2 text-sm font-medium text-info-foreground transition-colors hover:bg-secondary-600 focus:outline-none focus:ring-2 focus:ring-secondary-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Enviando invitación..." : "Enviar invitación"}
            </button>
          </form>

          <div className="mt-8 border-t border-border pt-6">
            <h3 className="text-sm font-semibold text-foreground">
              Cómo funciona
            </h3>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-foreground-muted">
              <li>Ingresa el correo electrónico del nuevo usuario</li>
              <li>El usuario recibirá un correo con un enlace de invitación</li>
              <li>
                Al hacer clic en el enlace, podrá configurar su contraseña
              </li>
              <li>Después, podrá iniciar sesión con su correo y contraseña</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
