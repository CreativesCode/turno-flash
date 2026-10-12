"use client";

import { PageMetadata } from "@/components/page-metadata";
import { Button, Logo } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

/** Supabase answers in English: show the owner something they can act on. */
function loginErrorMessage(error: { code?: string; message: string }): string {
  if (error.code === "invalid_credentials") {
    return "Email o contraseña incorrectos.";
  }
  if (error.code === "email_not_confirmed") {
    return "Todavía no confirmaste tu email. Revisa tu correo.";
  }
  if (error.code === "over_request_rate_limit") {
    return "Demasiados intentos. Espera unos minutos y vuelve a probar.";
  }
  return "No pudimos iniciar sesión. Revisa tu conexión e intenta de nuevo.";
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuth();

  // A session restored in the background (e.g. the network came back) goes
  // straight to the panel, without typing the password again.
  useEffect(() => {
    if (user) router.replace("/dashboard");
  }, [user, router]);

  const supabase = useMemo(() => createClient(), []);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        setError(loginErrorMessage(signInError));
        setLoading(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Error al iniciar sesión. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageMetadata
        title="Iniciar Sesión"
        description="Inicia sesión en Turno Flash para acceder a tu panel de control y gestionar tus turnos, clientes y servicios."
      />

      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-6">
        <div className="w-full max-w-sm">
          {/* Brand mark */}
          <div className="mb-8">
            <Logo size={32} withWordmark />
          </div>

          {/* Card */}
          <div>
            <h1 className="font-display text-[40px] leading-[1.05] text-foreground">
              Hola de nuevo
            </h1>
            <p className="mt-2 text-body text-foreground-muted">
              Entra con tu cuenta para administrar tu negocio.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="text-meta font-medium text-foreground-muted"
                >
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@ejemplo.com"
                  className="mt-1.5 block w-full min-h-12 rounded-control border border-border-2 bg-surface px-3.5 py-2.5 text-body text-foreground placeholder:text-foreground-subtle transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-meta font-medium text-foreground-muted"
                  >
                    Contraseña
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-meta font-semibold text-primary-700 hover:underline dark:text-primary-400"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <div className="relative mt-1.5">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full min-h-12 rounded-control border border-border-2 bg-surface px-3.5 py-2.5 text-body text-foreground placeholder:text-foreground-subtle transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
                    aria-label={
                      showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-card bg-danger-100 p-4 text-meta text-danger-600 dark:bg-danger-900 dark:text-danger-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={loading}
                className="w-full"
              >
                {loading ? "Iniciando sesión..." : "Ingresar"}
              </Button>
            </form>
          </div>

          <div className="mt-6 text-meta text-foreground-muted">
            ¿Aún no tienes cuenta?{" "}
            <Link
              href="/register"
              className="font-semibold text-foreground hover:text-primary"
            >
              Registra tu negocio gratis
            </Link>
          </div>

          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-foreground-muted transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
