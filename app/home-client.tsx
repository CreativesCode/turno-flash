"use client";

import { Avatar, Button, Card, Logo, StatusBadge } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  type LucideIcon,
  MessageSquare,
  Moon,
  Smartphone,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface Feature {
  Icon: LucideIcon;
  title: string;
  description: string;
  mesh: string;
}

const FEATURES: readonly Feature[] = [
  {
    Icon: Calendar,
    title: "Calendario Intuitivo",
    description:
      "Gestiona tus turnos con un calendario móvil-first. Vista lista, día y semana.",
    mesh: "mesh-info",
  },
  {
    Icon: MessageSquare,
    title: "WhatsApp",
    description:
      "Recordatorios automáticos uno a uno o por lote. Sin configurar nada.",
    mesh: "mesh-primary",
  },
  {
    Icon: Users,
    title: "Clientes",
    description:
      "Historial, notas y datos. Búsqueda instantánea por nombre o teléfono.",
    mesh: "mesh-secondary",
  },
  {
    Icon: Smartphone,
    title: "Móvil nativo",
    description:
      "iOS y Android. Bajo consumo de datos, ideal para conexiones lentas.",
    mesh: "mesh-warn",
  },
  {
    Icon: Clock,
    title: "Sin dobles reservas",
    description:
      "Tu calendario siempre actualizado en tiempo real, sin solapes.",
    mesh: "mesh-violet",
  },
  {
    Icon: BarChart3,
    title: "Página pública",
    description:
      "Comparte tu página de reservas con tus clientes. Ultra ligera y rápida.",
    mesh: "mesh-info",
  },
];

const FAQS: readonly { question: string; answer: string }[] = [
  {
    question: "¿Qué es Turno Flash?",
    answer:
      "Turno Flash es un sistema de reservas diseñado especialmente para salones, barberías, clínicas y talleres. Está optimizado para funcionar desde tu móvil con bajo consumo de datos, permitiéndote gestionar tus turnos de manera eficiente y sin complicaciones.",
  },
  {
    question: "¿Cuánto cuesta?",
    answer:
      "Turno Flash está diseñado para ser accesible para pequeños negocios. Ofrecemos planes flexibles que se adaptan a las necesidades de tu negocio. Contacta con nosotros para conocer nuestros precios.",
  },
  {
    question: "¿Necesito instalar algo?",
    answer:
      "No necesitas instalar nada complicado. Turno Flash funciona desde tu navegador móvil y también está disponible como aplicación nativa para iOS y Android. Todo desde un solo código base.",
  },
  {
    question: "¿Cómo funcionan las confirmaciones por WhatsApp?",
    answer:
      "El sistema puede enviar confirmaciones automáticas de reservas por WhatsApp. Esto reduce significativamente las llamadas telefónicas y mejora la comunicación con tus clientes. Puedes configurarlo según tus necesidades.",
  },
  {
    question: "¿Puedo usar Turno Flash en múltiples dispositivos?",
    answer:
      "Sí, Turno Flash funciona en cualquier dispositivo con navegador. Puedes acceder desde tu teléfono, tablet o computadora. Todos los datos se sincronizan en tiempo real.",
  },
  {
    question: "¿Qué pasa si no tengo internet?",
    answer:
      "Turno Flash requiere conexión a internet para sincronizar los datos. Sin embargo, está optimizado para funcionar con conexiones lentas y consumir muy pocos datos, ideal para áreas con conexión limitada.",
  },
  {
    question: "¿Puedo personalizar mi página de reservas?",
    answer:
      "Sí, cada negocio tiene su propia página pública de reservas con un enlace único. Tus clientes pueden reservar turnos directamente desde esta página sin necesidad de crear una cuenta.",
  },
  {
    question: "¿Cómo empiezo a usar Turno Flash?",
    answer:
      "Para comenzar, necesitas una invitación de un administrador. Una vez que recibas tu invitación por correo electrónico, podrás configurar tu contraseña y acceder al sistema. Si eres dueño de un negocio, contacta con nosotros para crear tu cuenta.",
  },
];

export default function HomePageClient() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    // Si hay tokens de autenticación en el hash, redirigir al callback
    if (window.location.hash.includes("access_token")) {
      const hash = window.location.hash;
      window.location.href = `/auth/callback${hash}`;
      return;
    }
  }, []);

  const ctaTarget = user ? "/dashboard" : "/login";
  const ctaLabel = user ? "Ir al Dashboard" : "Comenzar";

  return (
    <div className="min-h-screen bg-background">
      {/* Top nav */}
      <nav className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <Logo size={32} priority />
            <span className="text-base font-extrabold tracking-tight text-foreground">
              TurnoFlash
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
              aria-label={
                theme === "dark"
                  ? "Cambiar a tema claro"
                  : "Cambiar a tema oscuro"
              }
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </button>
            <Button
              variant="mesh-primary"
              size="md"
              onClick={() => router.push(ctaTarget)}
            >
              {ctaLabel}
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="mesh-primary relative overflow-hidden text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-24">
          <div className="flex flex-col justify-center">
            <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" />
              Recordatorios automáticos por WhatsApp
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Tu agenda,
              <br />
              en piloto automático.
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-white/85 sm:text-lg">
              Reservas, recordatorios y check-in para peluquerías, barberías,
              consultorios y estéticas. Todo desde el celular.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button
                size="lg"
                onClick={() => router.push(ctaTarget)}
                className="group bg-white! text-primary-700! shadow-md hover:bg-primary-50!"
              >
                {user ? "Ir al Dashboard" : "Probar gratis"}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                onClick={() => {
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="border! border-white/30! bg-white/15! text-white! backdrop-blur-md hover:bg-white/25!"
              >
                Conocer más
              </Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Sin dobles reservas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Confirmaciones WhatsApp
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                Optimizado para móvil
              </span>
            </div>
          </div>

          {/* Floating mockup card */}
          <div className="relative hidden items-center justify-center lg:flex">
            <Card
              className="w-full max-w-sm -rotate-2 p-3"
              style={{ boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)" }}
            >
              <div className="mb-2.5 flex items-center gap-2.5">
                <Avatar
                  name="Martina Gómez"
                  color="var(--color-secondary-500)"
                  size={32}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">
                    Martina Gómez
                  </div>
                  <div className="text-[11px] text-foreground-muted">
                    Coloración · 09:30
                  </div>
                </div>
                <StatusBadge status="confirmed" size="sm" />
              </div>
              <div className="flex gap-1.5">
                <div className="flex-1 rounded-lg bg-primary-50 px-2 py-2 text-center text-[11px] font-semibold text-primary-700 dark:bg-primary-900/30 dark:text-primary-300">
                  ✓ Recordatorio enviado
                </div>
                <div className="rounded-lg bg-primary-500 px-3 py-2 text-[11px] font-semibold text-white">
                  Check-in
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        className="bg-surface px-5 py-20 sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-primary-600">
              Para tu negocio
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Todo lo que necesitás, en un solo lugar.
            </h2>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => {
              const Icon = feature.Icon;
              return (
                <Card
                  key={feature.title}
                  className="flex items-start gap-3 p-4"
                >
                  <div
                    className={`${feature.mesh} flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] text-white shadow-sm`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-foreground">
                      {feature.title}
                    </div>
                    <div className="mt-1 text-[13px] leading-relaxed text-foreground-muted">
                      {feature.description}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Image gallery */}
      <section className="bg-muted px-5 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Así funciona Turno Flash
            </h2>
            <p className="mt-3 text-base text-foreground-muted">
              Interfaz intuitiva y fácil de usar
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="relative aspect-video overflow-hidden rounded-2xl bg-white shadow-sm"
              >
                <Image
                  src={`/images/tf-${item}.png`}
                  alt={`Vista previa de la aplicación ${item}`}
                  fill
                  className="object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="bg-surface px-5 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Preguntas Frecuentes
            </h2>
            <p className="mt-3 text-base text-foreground-muted">
              Todo lo que necesitás saber sobre Turno Flash
            </p>
          </div>
          <div className="mt-10 space-y-3">
            {FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <Card key={faq.question} className="overflow-hidden p-0">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted"
                  >
                    <span className="text-sm font-semibold text-foreground sm:text-base">
                      {faq.question}
                    </span>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 shrink-0 text-primary" />
                    ) : (
                      <ChevronDown className="h-5 w-5 shrink-0 text-foreground-muted" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="border-t border-border bg-surface-2 px-5 py-4 text-sm leading-relaxed text-foreground-muted">
                      {faq.answer}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="mesh-secondary rounded-3xl px-8 py-12 text-center text-white shadow-glow-secondary sm:px-12">
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              ¿Empezamos?
            </h2>
            <p className="mt-3 text-base text-white/85 sm:text-lg">
              {user
                ? "Tu cuenta está activa. Volvé al panel de control."
                : "Pedí tu invitación y simplificá la gestión de tu negocio."}
            </p>
            <div className="mt-7 flex justify-center">
              <Button
                size="lg"
                onClick={() => router.push(ctaTarget)}
                className="group bg-white! text-secondary-700! shadow-md hover:bg-secondary-50!"
              >
                {ctaLabel}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface px-5 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <Logo size={28} />
            <span className="text-sm font-bold tracking-tight text-foreground">
              TurnoFlash
            </span>
          </div>
          <p className="text-xs text-foreground-subtle">
            © {new Date().getFullYear()} Turno Flash. Todos los derechos
            reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
