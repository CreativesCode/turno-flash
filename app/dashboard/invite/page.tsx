"use client";

import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function InvitePage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Verificar que el usuario esté autenticado y sea admin
    const checkAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.push("/login");
        return;
      }

      // Obtener el rol del usuario desde la base de datos
      const { data: userData } = await supabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", session.user.id)
        .single();

      if (!userData || userData.role !== "admin") {
        // Si no es admin, redirigir al dashboard
        router.push("/dashboard");
        return;
      }

      setUserRole(userData.role);
    };

    checkAuth();
  }, [router, supabase]);

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

  if (!userRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-black">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-black dark:border-zinc-700 dark:border-t-zinc-50"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-black">
      <div className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-black dark:text-zinc-50">
              Invitar usuarios
            </h1>
            <button
              onClick={() => router.push("/dashboard")}
              className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
            >
              Volver al dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-8 shadow-sm dark:bg-zinc-900">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
              Enviar invitación
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              El usuario recibirá un correo con un enlace para configurar su
              contraseña y acceder a la plataforma.
            </p>
          </div>

          <form onSubmit={handleInvite} className="space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
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
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-base text-black placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-zinc-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-50 dark:placeholder-zinc-500 sm:text-sm"
                placeholder="usuario@ejemplo.com"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
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
              className="flex w-full justify-center rounded-md bg-black px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-50 dark:text-black dark:hover:bg-zinc-200"
            >
              {loading ? "Enviando invitación..." : "Enviar invitación"}
            </button>
          </form>

          <div className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Cómo funciona
            </h3>
            <ol className="mt-3 list-inside list-decimal space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
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
