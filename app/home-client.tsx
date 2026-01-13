"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/contexts/theme-context";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  MessageSquare,
  Moon,
  Smartphone,
  Sun,
  Users,
  Zap,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function HomePageClient() {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    // Si hay tokens de autenticación en el hash, redirigir al callback
    if (window.location.hash.includes("access_token")) {
      const hash = window.location.hash;
      window.location.href = `/auth/callback${hash}`;
      return;
    }
  }, []);

  const features = [
    {
      icon: Calendar,
      title: "Calendario Intuitivo",
      description:
        "Gestiona tus turnos con un calendario móvil-first, fácil de usar desde cualquier dispositivo.",
    },
    {
      icon: Smartphone,
      title: "Optimizado para Móvil",
      description:
        "Diseñado pensando en ti. Opera cómodamente desde tu teléfono con bajo consumo de datos.",
    },
    {
      icon: MessageSquare,
      title: "Confirmaciones WhatsApp",
      description:
        "Confirma reservas automáticamente por WhatsApp. Reduce llamadas y mejora la comunicación.",
    },
    {
      icon: Clock,
      title: "Sin Dobles Reservas",
      description:
        "Elimina el problema de reservas duplicadas. Tu calendario siempre actualizado en tiempo real.",
    },
    {
      icon: Users,
      title: "Gestión de Equipo",
      description:
        "Administra múltiples usuarios y organizaciones desde un solo lugar.",
    },
    {
      icon: BarChart3,
      title: "Página Pública",
      description:
        "Comparte tu página de reservas con tus clientes. Ultra ligera y rápida.",
    },
  ];

  const faqs = [
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

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-surface/80 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center">
              <Zap className="h-6 w-6 text-primary" />
              <span className="ml-2 text-xl font-bold text-foreground">
                Turno Flash
              </span>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={toggleTheme}
                className="rounded-md p-2 text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
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
                variant="ghost"
                onClick={() => router.push("/login")}
                size="md"
                className="hidden sm:inline-flex"
              >
                Iniciar Sesión
              </Button>
              <Button
                variant="primary"
                onClick={() => router.push("/login")}
                size="md"
              >
                Comenzar
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-linear-to-br from-primary-50 via-background to-secondary-50 px-4 py-20 dark:from-primary-950 dark:via-background dark:to-secondary-950 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div className="flex flex-col justify-center">
              <Badge variant="primary" className="mb-4 w-fit">
                Sistema de Reservas Inteligente
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Gestiona tus turnos desde cualquier lugar
              </h1>
              <p className="mt-6 text-lg text-foreground-muted">
                Turno Flash es la solución perfecta para salones, barberías,
                clínicas y talleres. Optimizado para móvil, bajo consumo de
                datos y fácil de usar.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={() => router.push("/login")}
                  className="group"
                >
                  Comenzar ahora
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
                <Button
                  variant="secondary"
                  size="lg"
                  onClick={() => {
                    document
                      .getElementById("features")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                >
                  Conocer más
                </Button>
              </div>
              <div className="mt-12 flex flex-wrap gap-6 text-sm text-foreground-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>Sin dobles reservas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>Confirmaciones WhatsApp</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>Optimizado para móvil</span>
                </div>
              </div>
            </div>
            <div className="relative hidden lg:block">
              <div className="relative h-[500px] overflow-hidden rounded-2xl bg-linear-to-br from-primary-200 via-secondary-200 to-primary-300 dark:from-primary-800 dark:via-secondary-800 dark:to-primary-900">
                <Image
                  src="/images/bg-hero.png"
                  alt="Vista previa de la aplicación"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="bg-surface px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Todo lo que necesitas en un solo lugar
            </h2>
            <p className="mt-4 text-lg text-foreground-muted">
              Características diseñadas para simplificar la gestión de tu
              negocio
            </p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const isEven = index % 2 === 0;
              return (
                <div
                  key={index}
                  className="rounded-lg border border-border bg-muted p-6 transition-all hover:border-primary hover:shadow-lg"
                >
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg ${
                      isEven
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-2 text-foreground-muted">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Image Gallery Section */}
      <section className="bg-muted px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Así funciona Turno Flash
            </h2>
            <p className="mt-4 text-lg text-foreground-muted">
              Interfaz intuitiva y fácil de usar
            </p>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => {
              return (
                <div
                  key={item}
                  className="relative overflow-hidden rounded-xl bg-white"
                >
                  <div className="aspect-video flex items-center justify-center">
                    <Image
                      src={`/images/tf-${item}.png`}
                      alt={`Vista previa de la aplicación ${item}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="bg-surface px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Preguntas Frecuentes
            </h2>
            <p className="mt-4 text-lg text-foreground-muted">
              Todo lo que necesitas saber sobre Turno Flash
            </p>
          </div>
          <div className="mt-12 space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-lg border border-border bg-muted"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-primary-50 hover:text-primary-700 dark:hover:bg-primary-950/30 dark:hover:text-primary-400"
                >
                  <span className="font-semibold text-foreground">
                    {faq.question}
                  </span>
                  {openFaq === index ? (
                    <ChevronUp className="h-5 w-5 text-primary" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-foreground-muted" />
                  )}
                </button>
                {openFaq === index && (
                  <div className="border-t border-border bg-muted p-6">
                    <p className="text-foreground-muted">{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-linear-to-br from-primary-600 via-secondary-600 to-primary-700 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            ¿Listo para simplificar tu negocio?
          </h2>
          <p className="mt-6 text-lg text-white/90">
            Únete a Turno Flash y comienza a gestionar tus reservas de manera
            eficiente hoy mismo.
          </p>
          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push("/login")}
              className="bg-white text-primary-600 hover:bg-primary-50 dark:bg-white dark:text-primary-700 dark:hover:bg-primary-100"
            >
              Comenzar ahora
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div className="flex items-center">
              <Zap className="h-5 w-5 text-primary" />
              <span className="ml-2 font-semibold text-foreground">
                Turno Flash
              </span>
            </div>
            <p className="text-sm text-foreground-muted">
              © {new Date().getFullYear()} Turno Flash. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
