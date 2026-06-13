"use client";

import { Avatar, Button, Card, Logo, StatusBadge } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  HeartHandshake,
  KeyRound,
  Lock,
  type LucideIcon,
  Mail,
  MessageSquare,
  Moon,
  ServerCog,
  Smartphone,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const CONTACT_EMAIL = "robert.cabrer92@gmail.com";

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
    title: "WhatsApp en piloto automático",
    description:
      "Confirmaciones, recordatorios, valoraciones post-visita y resumen diario para el dueño. Sin configurar nada.",
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
    title: "Reportes y estadísticas",
    description:
      "Ingresos, servicios top, horas pico y rendimiento de tu equipo. Decide con datos, no con intuición.",
    mesh: "mesh-info",
  },
  {
    Icon: HeartHandshake,
    title: "Recupera clientes",
    description:
      "Detecta clientes que dejaron de venir y envíales una invitación por WhatsApp con un clic.",
    mesh: "mesh-secondary",
  },
  {
    Icon: Users,
    title: "Lista de espera inteligente",
    description:
      "Si se cancela un turno, avisamos automáticamente al primer cliente en espera.",
    mesh: "mesh-warn",
  },
];

const HOW_IT_WORKS: readonly {
  step: string;
  title: string;
  description: string;
}[] = [
    {
      step: "1",
      title: "Crea tu negocio",
      description:
        "Registra tu organización, define tus servicios, precios y el equipo que atiende.",
    },
    {
      step: "2",
      title: "Agenda los turnos",
      description:
        "Carga las citas en segundos desde el móvil. El sistema evita solapes automáticamente.",
    },
    {
      step: "3",
      title: "WhatsApp hace el resto",
      description:
        "Confirmaciones y recordatorios automáticos. Tus clientes responden OK o CANCELAR y la agenda se actualiza sola.",
    },
  ];

const TRUST_POINTS: readonly Feature[] = [
  {
    Icon: Lock,
    title: "Datos aislados por negocio",
    description:
      "Cada organización solo accede a su propia información, con aislamiento a nivel de base de datos (Row Level Security).",
    mesh: "mesh-primary",
  },
  {
    Icon: KeyRound,
    title: "Roles y permisos",
    description:
      "Dueño, staff y permisos especiales: cada miembro del equipo ve exactamente lo que necesita.",
    mesh: "mesh-secondary",
  },
  {
    Icon: ServerCog,
    title: "Infraestructura confiable",
    description:
      "Cifrado en tránsito (HTTPS/TLS), respaldos automáticos y sincronización en tiempo real.",
    mesh: "mesh-info",
  },
  {
    Icon: Building2,
    title: "Hecho para servicios",
    description:
      "Salones, barberías, clínicas, estéticas y talleres: flujos de trabajo pensados para el día a día real.",
    mesh: "mesh-violet",
  },
];

const PLANS: readonly {
  name: string;
  price: string;
  period: string;
  note?: string;
  features: string[];
}[] = [
    {
      name: "Mensual",
      price: "$9.99",
      period: "USD / mes",
      features: [
        "Turnos y clientes ilimitados",
        "Recordatorios y valoraciones por WhatsApp",
        "Reportes y estadísticas del negocio",
        "Campañas para recuperar clientes",
        "Equipo y servicios ilimitados",
        "Soporte por correo",
      ],
    },
    {
      name: "Anual",
      price: "$79.99",
      period: "USD / año",
      note: "Ahorra 33%",
      features: [
        "Todo lo del plan mensual",
        "Equivale a $6.67 / mes",
        "Un solo pago al año",
        "Prioridad en soporte",
      ],
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
      "Ofrecemos un plan mensual de $9.99 USD y un plan anual de $79.99 USD (equivale a $6.67/mes, un 33% de ahorro). La suscripción se contrata desde la app Android a través de Google Play y puedes cancelarla en cualquier momento. También ofrecemos licencias gestionadas directamente para negocios que lo prefieran: contáctanos.",
  },
  {
    question: "¿Necesito instalar algo?",
    answer:
      "No necesitas instalar nada complicado. Turno Flash funciona desde tu navegador móvil y también está disponible como aplicación nativa para iOS y Android. Todo desde un solo código base.",
  },
  {
    question: "¿Cómo funcionan las automatizaciones por WhatsApp?",
    answer:
      "Turno Flash trabaja solo: envía la confirmación al crear el turno, recordatorios 24 horas y 1 hora antes (el cliente responde OK o CANCELAR y la agenda se actualiza), pide una valoración de 1 a 5 estrellas al completar la visita, avisa a la lista de espera cuando se libera un lugar y puede enviarte cada mañana un resumen de tu día con los turnos e ingresos estimados.",
  },
  {
    question: "¿Qué reportes y estadísticas incluye?",
    answer:
      "El panel de reportes muestra los ingresos por día con comparación contra el período anterior, los servicios que más facturan, el rendimiento de cada profesional (turnos, ingresos y valoraciones de clientes), las horas pico de tu negocio, el origen de las reservas y cuántos clientes nuevos ganaste. Todo se calcula automáticamente con los turnos que ya cargas, y puedes exportar turnos y clientes a Excel (CSV) cuando quieras.",
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

  const ctaTarget = user ? "/dashboard" : "/register";
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
            {!user && (
              <Link
                href="/login"
                className="hidden text-sm font-semibold text-foreground-muted transition-colors hover:text-foreground sm:inline"
              >
                Iniciar sesión
              </Link>
            )}
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

      {/* How it works */}
      <section className="px-5 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-primary-600">
              Cómo funciona
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              En marcha en menos de un día.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {HOW_IT_WORKS.map((item) => (
              <Card key={item.step} className="p-6">
                <div className="mesh-primary flex h-10 w-10 items-center justify-center rounded-full text-base font-extrabold text-white shadow-sm">
                  {item.step}
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground-muted">
                  {item.description}
                </p>
              </Card>
            ))}
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

      {/* Trust / security */}
      <section className="bg-surface px-5 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-primary-600">
              Seguridad y confianza
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Los datos de tu negocio, protegidos.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-base text-foreground-muted">
              Tratamos la información de tu negocio y de tus clientes con el
              mismo cuidado con el que tú atiendes tu agenda. Consulta nuestra{" "}
              <Link className="underline" href="/privacy">
                Política de Privacidad
              </Link>
              .
            </p>
          </div>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_POINTS.map((point) => {
              const Icon = point.Icon;
              return (
                <Card key={point.title} className="p-5">
                  <div
                    className={`${point.mesh} flex h-10 w-10 items-center justify-center rounded-[10px] text-white shadow-sm`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-foreground">
                    {point.title}
                  </h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-foreground-muted">
                    {point.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-5 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <div className="text-xs font-bold uppercase tracking-[0.08em] text-primary-600">
              Precios
            </div>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Simple y de bajo costo.
            </h2>
            <p className="mt-3 text-base text-foreground-muted">
              Un solo plan con todo incluido. Elige cómo pagarlo.
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {PLANS.map((plan) => (
              <Card key={plan.name} className="relative flex flex-col p-6">
                {plan.note && (
                  <span className="absolute right-4 top-4 rounded-full bg-success-100 px-2.5 py-0.5 text-xs font-semibold text-success-800 dark:bg-success-900/20 dark:text-success-400">
                    {plan.note}
                  </span>
                )}
                <h3 className="text-base font-bold text-foreground">
                  {plan.name}
                </h3>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-sm text-foreground-muted">
                    {plan.period}
                  </span>
                </div>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm text-foreground-muted"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600 dark:text-success-400" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  variant="mesh-primary"
                  size="lg"
                  className="mt-6"
                  onClick={() => router.push(ctaTarget)}
                >
                  {user ? "Ir al Dashboard" : "Comenzar"}
                </Button>
              </Card>
            ))}
          </div>
          <p className="mt-6 text-center text-xs text-foreground-muted">
            La suscripción se gestiona a través de Google Play y se renueva
            automáticamente; cancela cuando quieras. Consulta los{" "}
            <Link className="underline" href="/terms">
              Términos y Condiciones
            </Link>
            .
          </p>
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
      <footer className="border-t border-border bg-surface px-5 pb-8 pt-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <div className="flex items-center gap-2.5">
                <Logo size={28} />
                <span className="text-sm font-bold tracking-tight text-foreground">
                  TurnoFlash
                </span>
              </div>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-foreground-muted">
                Sistema de gestión de turnos para negocios de servicios.
                Reservas, recordatorios por WhatsApp y control total de tu
                agenda, desde el móvil.
              </p>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="mt-4 inline-flex items-center gap-2 text-sm text-foreground-muted transition-colors hover:text-foreground"
              >
                <Mail className="h-4 w-4" />
                {CONTACT_EMAIL}
              </a>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-foreground">
                Producto
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a
                    href="#features"
                    className="text-foreground-muted transition-colors hover:text-foreground"
                  >
                    Funcionalidades
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-foreground-muted transition-colors hover:text-foreground"
                  >
                    Precios
                  </a>
                </li>
                <li>
                  <Link
                    href="/login"
                    className="text-foreground-muted transition-colors hover:text-foreground"
                  >
                    Iniciar sesión
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-foreground">
                Legal
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link
                    href="/privacy"
                    className="text-foreground-muted transition-colors hover:text-foreground"
                  >
                    Política de Privacidad
                  </Link>
                </li>
                <li>
                  <Link
                    href="/terms"
                    className="text-foreground-muted transition-colors hover:text-foreground"
                  >
                    Términos y Condiciones
                  </Link>
                </li>
                <li>
                  <Link
                    href="/account-deletion"
                    className="text-foreground-muted transition-colors hover:text-foreground"
                  >
                    Eliminación de cuenta
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 border-t border-border pt-6">
            <p className="text-center text-xs text-foreground-subtle">
              © {new Date().getFullYear()} Turno Flash. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
