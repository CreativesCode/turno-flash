"use client";

import { PageMetadata } from "@/components/page-metadata";
import { Button, Card, Logo } from "@/components/ui";
import { createClient } from "@/utils/supabase/client";
import { Logger } from "@/utils/logger";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

const TIMEZONES = [
  "America/Mexico_City",
  "America/Argentina/Buenos_Aires",
  "America/Santiago",
  "America/Bogota",
  "America/Lima",
  "America/Caracas",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
] as const;

const inputClass =
  "mt-1.5 block w-full rounded-lg border border-border-2 bg-surface px-3 py-2.5 text-sm text-foreground placeholder-foreground-subtle transition-shadow focus:border-primary-500 focus:outline-none focus:ring-3 focus:ring-primary-500/15";
const labelClass =
  "text-xs font-semibold tracking-wide text-foreground-muted uppercase";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [fullName, setFullName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [timezone, setTimezone] = useState<string>("America/Mexico_City");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        setError("Falta configuración de Supabase (URL/ANON KEY).");
        setLoading(false);
        return;
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/self-signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          org_name: orgName,
          org_timezone: timezone,
          org_whatsapp_phone: whatsapp || undefined,
        }),
      });

      const contentType = response.headers.get("content-type") || "";
      const data = contentType.includes("application/json")
        ? await response.json()
        : { error: await response.text() };

      if (!response.ok || data?.error) {
        setError(data?.error || "No se pudo completar el registro.");
        setLoading(false);
        return;
      }

      // El email queda auto-confirmado: iniciamos sesión para crear la sesión
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // La cuenta se creó pero el login falló: mandamos al login manual
        void Logger.error("Auto sign-in tras registro falló:", signInError);
        router.push("/login");
        return;
      }

      router.push("/dashboard");
    } catch (err) {
      void Logger.error("Error en registro:", err);
      setError("Error al registrarte. Intentá nuevamente.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageMetadata
        title="Crear cuenta"
        description="Registrá tu negocio en Turno Flash y empezá tu prueba gratis."
      />

      <div className="flex flex-1 items-center justify-center px-5 py-12 sm:px-6">
        <div className="w-full max-w-md">
          {/* Brand mark */}
          <div className="mb-7 flex flex-col items-center gap-3">
            <Logo size={56} priority />
            <div className="text-xl font-extrabold tracking-tight text-foreground">
              TurnoFlash
            </div>
          </div>

          <Card className="p-6 sm:p-7">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              Registrá tu negocio
            </h1>
            <p className="mt-1 text-sm text-foreground-muted">
              Creá tu cuenta y empezá tu prueba gratis de 7 días.
            </p>

            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <div>
                <label htmlFor="fullName" className={labelClass}>
                  Tu nombre
                </label>
                <input
                  id="fullName"
                  name="fullName"
                  type="text"
                  autoComplete="name"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre y apellido"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="orgName" className={labelClass}>
                  Nombre del negocio
                </label>
                <input
                  id="orgName"
                  name="orgName"
                  type="text"
                  required
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Mi Negocio"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="email" className={labelClass}>
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
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="password" className={labelClass}>
                  Contraseña
                </label>
                <div className="relative mt-1.5">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className={`${inputClass} mt-0 pr-10`}
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

              <div>
                <label htmlFor="whatsapp" className={labelClass}>
                  WhatsApp del negocio (opcional)
                </label>
                <input
                  id="whatsapp"
                  name="whatsapp"
                  type="tel"
                  autoComplete="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+5215512345678"
                  className={inputClass}
                />
              </div>

              <div>
                <label htmlFor="timezone" className={labelClass}>
                  Zona horaria
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className={inputClass}
                >
                  {TIMEZONES.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </select>
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
                {loading ? "Creando tu cuenta..." : "Crear cuenta y empezar"}
              </Button>
            </form>
          </Card>

          <div className="mt-5 text-center text-xs text-foreground-muted">
            ¿Ya tenés cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-foreground hover:text-primary"
            >
              Iniciá sesión
            </Link>
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
