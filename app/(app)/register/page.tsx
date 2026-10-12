"use client";

import { PageMetadata } from "@/components/page-metadata";
import { Button, Card, Logo } from "@/components/ui";
import {
  LICENSE_PLAN_INFO,
  LICENSE_PLANS,
  type LicensePlan,
  TRIAL_DAYS,
  formatUsd,
  licenseMonthlyPrice,
} from "@/config/license-pricing";
import { useIsStoreApp } from "@/hooks/useIsStoreApp";
import { createClient } from "@/utils/supabase/client";
import { Logger } from "@/utils/logger";
import { toInternationalPhone } from "@/utils/phone";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

const TIMEZONES = [
  "America/Havana",
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

/** What the business sells. It maps to the two modules of the app. */
const BUSINESS_KINDS = [
  {
    key: "appointments",
    title: "Doy turnos o citas",
    detail: "Peluquería, barbería, clínica, estudio, taller…",
  },
  {
    key: "trips",
    title: "Vendo asientos de viajes",
    detail: "Guaguas, excursiones, traslados.",
  },
  { key: "both", title: "Las dos cosas", detail: "" },
] as const;

type BusinessKind = (typeof BUSINESS_KINDS)[number]["key"];

/** Plans a business that takes appointments picks from, by team size. */
const APPOINTMENT_PLANS = LICENSE_PLANS.filter(
  (plan) => LICENSE_PLAN_INFO[plan].appointments
);

const TEAM_SIZE_LABEL: Record<LicensePlan, string> = {
  personal: "Trabajo por mi cuenta",
  salon: "Somos un equipo, hasta 5 profesionales",
  salon_large: "Somos más de 5 profesionales",
  trips: "",
};

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
  const [timezone, setTimezone] = useState<string>("America/Havana");
  const [kind, setKind] = useState<BusinessKind>("appointments");
  const [teamPlan, setTeamPlan] = useState<LicensePlan>("personal");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Honeypot (P1-29): invisible for people, bots fill it
  const [website, setWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The store app does not show prices (see useIsStoreApp)
  const storeApp = useIsStoreApp();
  const plan: LicensePlan = kind === "trips" ? "trips" : teamPlan;
  const monthlyPrice = formatUsd(
    licenseMonthlyPrice(plan, { secondModule: kind === "both" })
  );

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    // Cuban mobiles have 8 digits; anything shorter cannot receive WhatsApp
    if (ownerPhone.replace(/\D/g, "").length < 8) {
      setError("Escribe tu número de WhatsApp completo.");
      return;
    }

    setLoading(true);

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
          modules: kind,
          plan,
          owner_phone: toInternationalPhone(ownerPhone),
          website,
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
      setError("Error al registrarte. Intenta nuevamente.");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PageMetadata
        title="Crear cuenta"
        description="Registra tu negocio en Turno Flash y empieza tu prueba gratis."
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
              Registra tu negocio
            </h1>
            <p className="mt-1 text-sm text-foreground-muted">
              Crea tu cuenta y empieza tu prueba gratis de {TRIAL_DAYS} días.
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
                <span className={labelClass}>¿Qué hace tu negocio?</span>
                <div className="mt-1.5 flex flex-col gap-2">
                  {BUSINESS_KINDS.map((option) => (
                    <label
                      key={option.key}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                        kind === option.key
                          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                          : "border-border-2 bg-surface hover:bg-muted"
                      }`}
                    >
                      <input
                        type="radio"
                        name="business-kind"
                        value={option.key}
                        checked={kind === option.key}
                        onChange={() => setKind(option.key)}
                        className="mt-0.5 h-4 w-4 shrink-0 accent-primary-500"
                      />
                      <span className="text-sm">
                        <span className="block font-semibold text-foreground">
                          {option.title}
                        </span>
                        {option.detail && (
                          <span className="mt-0.5 block text-xs text-foreground-muted">
                            {option.detail}
                          </span>
                        )}
                      </span>
                    </label>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-foreground-subtle">
                  Define qué ves en la app. Para cambiarlo después, escríbenos por WhatsApp.
                </p>
              </div>

              {kind !== "trips" && (
                <div>
                  <span className={labelClass}>¿Cuántos atienden?</span>
                  <div className="mt-1.5 flex flex-col gap-2">
                    {APPOINTMENT_PLANS.map((option) => (
                      <label
                        key={option}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                          teamPlan === option
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                            : "border-border-2 bg-surface hover:bg-muted"
                        }`}
                      >
                        <input
                          type="radio"
                          name="team-plan"
                          value={option}
                          checked={teamPlan === option}
                          onChange={() => setTeamPlan(option)}
                          className="h-4 w-4 shrink-0 accent-primary-500"
                        />
                        <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
                          {TEAM_SIZE_LABEL[option]}
                        </span>
                        <span className="shrink-0 text-xs font-semibold text-foreground-muted">
                          Plan {LICENSE_PLAN_INFO[option].label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <p className="rounded-lg bg-surface-2 px-3 py-2.5 text-xs text-foreground-muted">
                Tu plan:{" "}
                <span className="font-semibold text-foreground">
                  {LICENSE_PLAN_INFO[plan].label}
                  {kind === "both" ? " + Pasajes" : ""}
                  {storeApp ? "" : `, ${monthlyPrice} al mes`}
                </span>
                .{" "}
                {storeApp
                  ? `Tienes ${TRIAL_DAYS} días gratis para probarlo.`
                  : `Hoy no pagas nada: tienes ${TRIAL_DAYS} días gratis para probarlo.`}
              </p>

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
                <label htmlFor="ownerPhone" className={labelClass}>
                  Tu WhatsApp
                </label>
                <input
                  id="ownerPhone"
                  name="ownerPhone"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={ownerPhone}
                  onChange={(e) => setOwnerPhone(e.target.value)}
                  placeholder="5 123 4567"
                  className={inputClass}
                />
                <p className="mt-1.5 text-xs text-foreground-subtle">
                  Ahí te avisamos antes de que venza tu acceso. No lo ven tus
                  clientes.
                </p>
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

              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
              />

              {/* D-06: registration stays open, but the data must be real */}
              <p className="text-xs text-foreground-muted">
                Usa tus datos reales: con ese email y ese WhatsApp te
                contactamos.
              </p>

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
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/login"
              className="font-semibold text-foreground hover:text-primary"
            >
              Inicia sesión
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
