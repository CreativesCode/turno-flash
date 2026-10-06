"use client";

import { Button, Card } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";
import { useSetupProgress } from "@/hooks/useSetupProgress.query";
import type { SetupProgress } from "@/services/onboarding.service";
import { Check, ChevronDown, PartyPopper } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface GuideStep {
  key: string;
  module?: "appointments" | "trips";
  title: string;
  /** Short sentences for people who are not used to apps. */
  text: string[];
  action: string;
  href: string;
  done: (progress: SetupProgress) => boolean;
}

/** Real screenshots (phone, 520x933) in public/images/guide/<key>.webp. */
const STEPS: readonly GuideStep[] = [
  {
    key: "services",
    module: "appointments",
    title: "Agrega tus servicios",
    text: [
      "Escribe lo que ofreces, cuánto tiempo lleva y cuánto cuesta. Por ejemplo: «Corte de pelo», 30 minutos, 500.",
      "Al terminar, toca el botón verde «Crear servicio».",
    ],
    action: "Agregar un servicio",
    href: "/dashboard/services?create=1",
    done: (p) => p.services > 0,
  },
  {
    key: "staff",
    module: "appointments",
    title: "Agrega a quien atiende",
    text: [
      "Escribe el nombre y el apellido de cada persona que atiende clientes. Si trabajas solo, anótate tú. Abajo, toca «Crear profesional».",
      "Después, en los tres puntitos de su tarjeta, toca «Horario y servicios» para decir qué días trabaja.",
    ],
    action: "Agregar un profesional",
    href: "/dashboard/staff?create=1",
    done: (p) => p.staff > 0,
  },
  {
    key: "appointment",
    module: "appointments",
    title: "Anota tu primer turno",
    text: [
      "Busca al cliente por su nombre, elige el día, la hora y el servicio, y toca «Crear turno».",
      "Si el cliente es nuevo, toca «+ Nuevo» para anotarlo ahí mismo.",
    ],
    action: "Crear un turno",
    href: "/dashboard/appointments?create=1",
    done: (p) => p.appointments > 0,
  },
  {
    key: "trip",
    module: "trips",
    title: "Crea tu primera salida",
    text: [
      "Escribe el destino, el día, la hora, cuántos asientos hay y el precio. También puedes poner los lugares donde recoges a los pasajeros.",
      "Al final, toca «Crear salida».",
    ],
    action: "Crear una salida",
    href: "/dashboard/trips?create=1",
    done: (p) => p.trips > 0,
  },
  {
    key: "passenger",
    module: "trips",
    title: "Anota tu primer pasaje",
    text: [
      "Entra en una salida y toca «Cargar reserva».",
      "Escribe el nombre y el teléfono de quien viaja, y abajo toca otra vez «Cargar reserva».",
    ],
    action: "Ir a mis salidas",
    href: "/dashboard/trips",
    done: (p) => p.tripBookings > 0,
  },
  {
    key: "contact",
    title: "Pon tu número de WhatsApp",
    text: [
      "Tus clientes reciben avisos de sus reservas. Con tu número, saben a quién escribir si tienen dudas.",
      "En Ajustes, busca «Contacto para tus clientes», escribe tu nombre y tu número, y toca «Guardar».",
    ],
    action: "Poner mi número",
    href: "/dashboard/settings",
    done: (p) => p.hasContactPhone,
  },
  {
    key: "booking-page",
    module: "appointments",
    title: "Comparte tu página de reservas",
    text: [
      "En Ajustes, enciende «Página de reservas online» y toca «Guardar cambios». Después toca «Compartir» para mandar el enlace por WhatsApp.",
      "Tus clientes eligen el servicio y la hora desde su teléfono, sin llamarte.",
    ],
    action: "Activar mi página",
    href: "/dashboard/settings",
    done: (p) => p.bookingPageEnabled,
  },
  {
    key: "trips-page",
    module: "trips",
    title: "Comparte tu página de pasajes",
    text: [
      "En Ajustes, enciende «Página de reservas de viajes» y toca «Guardar cambios». Después toca «Compartir» para mandar el enlace por WhatsApp.",
      "Tus clientes eligen la salida y los asientos desde su teléfono.",
    ],
    action: "Activar mi página",
    href: "/dashboard/settings",
    done: (p) => p.seatBookingEnabled,
  },
];

const hiddenKey = (orgId: string) => `turnoflash:setup-guide-hidden:${orgId}`;

function readHidden(orgId: string): boolean {
  try {
    return window.localStorage.getItem(hiddenKey(orgId)) === "1";
  } catch {
    return false;
  }
}

/**
 * "Pon en marcha tu negocio" on Inicio (P2-15): the steps a new owner needs,
 * one at a time, each with a real screenshot and a button that opens the
 * right screen. Ticks itself from the data; hidden for good once closed.
 */
export function SetupGuide() {
  const router = useRouter();
  const { profile } = useAuth();
  const { modules } = useOrganizationModules();
  const orgId = profile?.organization_id ?? "";
  const [hidden, setHidden] = useState(() =>
    typeof window === "undefined" ? true : readHidden(orgId)
  );
  /** null = the next pending step; "" = all closed */
  const [openKey, setOpenKey] = useState<string | null>(null);
  const isOwner = profile?.role === "owner";
  const { data: progress } = useSetupProgress(isOwner && !hidden);

  if (!isOwner || hidden || !progress) return null;

  const hide = () => {
    try {
      window.localStorage.setItem(hiddenKey(orgId), "1");
    } catch {
      // Shown again next time: harmless
    }
    setHidden(true);
  };

  const steps = STEPS.filter((s) => !s.module || modules[s.module]);
  const doneCount = steps.filter((s) => s.done(progress)).length;
  const activeKey = openKey ?? steps.find((s) => !s.done(progress))?.key ?? null;

  if (doneCount === steps.length) {
    return (
      <Card className="mb-6 flex flex-col items-center p-6 text-center lg:mb-8">
        <PartyPopper className="h-10 w-10 text-primary-600" />
        <h2 className="mt-3 text-lg font-extrabold text-foreground">
          ¡Listo! Tu negocio ya está en marcha
        </h2>
        <p className="mt-1 text-sm text-foreground-muted">
          Si tienes dudas, en el menú está «Ayuda» con todas las explicaciones.
        </p>
        <Button
          size="lg"
          variant="soft"
          onClick={hide}
          className="mt-4 w-full max-w-xs justify-center"
        >
          Cerrar esta guía
        </Button>
      </Card>
    );
  }

  return (
    <Card className="mb-6 overflow-hidden p-0 lg:mb-8">
      <div className="p-5 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-foreground">
              Pon en marcha tu negocio
            </h2>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Sigue estos pasos, uno por uno. Te llevan pocos minutos.
            </p>
          </div>
          <button
            type="button"
            onClick={hide}
            className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-foreground-muted hover:bg-muted hover:text-foreground"
          >
            Ocultar
          </button>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-primary-500 transition-all"
              style={{ width: `${(doneCount / steps.length) * 100}%` }}
            />
          </div>
          <span className="shrink-0 text-xs font-bold text-foreground-muted">
            {doneCount} de {steps.length} listos
          </span>
        </div>
      </div>

      <ol className="border-t border-border">
        {steps.map((step, index) => {
          const done = step.done(progress);
          const open = step.key === activeKey;
          return (
            <li key={step.key} className="border-b border-border last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenKey(open ? "" : step.key)}
                aria-expanded={open}
                className="flex w-full cursor-pointer items-center gap-3 px-5 py-3.5 text-left"
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold ${
                    done
                      ? "bg-success-500 text-white"
                      : open
                        ? "bg-primary-500 text-white"
                        : "bg-surface-2 text-foreground-muted"
                  }`}
                >
                  {done ? <Check className="h-4 w-4" /> : index + 1}
                </span>
                <span
                  className={`min-w-0 flex-1 text-[15px] font-bold ${
                    done ? "text-foreground-muted line-through" : "text-foreground"
                  }`}
                >
                  {step.title}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-foreground-subtle transition-transform ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>

              {open && (
                <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-start">
                  <figure className="mx-auto w-full max-w-60 shrink-0 sm:mx-0">
                    <figcaption className="mb-1.5 text-center text-[11px] font-bold uppercase tracking-wide text-foreground-muted">
                      Así se ve en tu pantalla
                    </figcaption>
                    {/* eslint-disable-next-line @next/next/no-img-element -- static export, no image optimizer */}
                    <img
                      src={`/images/guide/${step.key}.webp`}
                      alt={`Pantalla para: ${step.title.toLowerCase()}`}
                      width={520}
                      height={933}
                      loading="lazy"
                      className="h-auto w-full rounded-xl border border-border shadow-sm"
                    />
                  </figure>
                  <div className="flex flex-1 flex-col gap-2">
                    {step.text.map((sentence) => (
                      <p key={sentence} className="text-[15px] leading-relaxed text-foreground">
                        {sentence}
                      </p>
                    ))}
                    {done ? (
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-bold text-success-700 dark:text-success-400">
                        <Check className="h-4 w-4" /> Ya lo hiciste
                      </p>
                    ) : (
                      <Button
                        size="lg"
                        variant="mesh-primary"
                        onClick={() => router.push(step.href)}
                        className="mt-2 w-full justify-center sm:w-auto sm:self-start"
                      >
                        {step.action}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
