"use client";

import { PageMetadata } from "@/components/page-metadata";
import { Button, Card } from "@/components/ui";
import { createClient } from "@/utils/supabase/client";
import { ArrowLeft, Eye, EyeOff, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

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
        setError(signInError.message);
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
        <div className="w-full max-w-md">
          {/* Brand mark */}
          <div className="mb-7 flex flex-col items-center gap-3">
            <div className="mesh-primary flex h-14 w-14 items-center justify-center rounded-2xl text-white shadow-glow-primary">
              <Zap className="h-7 w-7" />
            </div>
            <div className="text-xl font-extrabold tracking-tight text-foreground">
              TurnoFlash
            </div>
          </div>

          {/* Card */}
          <Card className="p-6 sm:p-7">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Bienvenida
            </h1>
            <p className="mt-1 text-sm text-foreground-muted">
              Ingresá con tu cuenta para administrar tu agenda.
            </p>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="text-xs font-semibold tracking-wide text-foreground-muted uppercase"
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
                  className="mt-1.5 block w-full rounded-lg border border-border-2 bg-surface px-3 py-2.5 text-sm text-foreground placeholder-foreground-subtle transition-shadow focus:border-primary-500 focus:outline-none focus:ring-3 focus:ring-primary-500/15"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="text-xs font-semibold tracking-wide text-foreground-muted uppercase"
                >
                  Contraseña
                </label>
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
                    className="block w-full rounded-lg border border-border-2 bg-surface px-3 py-2.5 pr-10 text-sm text-foreground placeholder-foreground-subtle transition-shadow focus:border-primary-500 focus:outline-none focus:ring-3 focus:ring-primary-500/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-md text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
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
                <div className="rounded-lg bg-danger-50 px-3 py-2.5 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                variant="mesh-primary"
                size="md"
                disabled={loading}
                className="w-full"
              >
                {loading ? "Iniciando sesión..." : "Ingresar"}
              </Button>
            </form>
          </Card>

          <div className="mt-5 text-center text-xs text-foreground-muted">
            ¿Aún no tenés cuenta?{" "}
            <span className="font-semibold text-foreground">
              Pedí una invitación
            </span>
          </div>

          <div className="mt-8 text-center">
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
