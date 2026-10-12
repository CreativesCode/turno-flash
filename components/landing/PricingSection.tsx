"use client";

import { Button, Card } from "@/components/ui";
import {
  BILLING_PERIOD_INFO,
  BILLING_PERIODS,
  type BillingPeriod,
  LICENSE_GRACE_DAYS,
  LICENSE_PLAN_INFO,
  LICENSE_PLANS,
  type LicensePlan,
  REFERRAL_DAYS,
  SECOND_MODULE_PRICE,
  TRIAL_DAYS,
  formatUsd,
  licenseMonthlyPrice,
  licensePeriodAmount,
} from "@/config/license-pricing";
import {
  Banknote,
  Building2,
  Bus,
  CalendarClock,
  CheckCircle2,
  Gift,
  type LucideIcon,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/** What sets each plan apart; everything else is included in all of them. */
const PLAN_DETAILS: Record<
  LicensePlan,
  { Icon: LucideIcon; mesh: string; points: string[] }
> = {
  personal: {
    Icon: User,
    mesh: "mesh-info",
    points: [
      "1 profesional",
      "Agenda, clientes y servicios",
      "Tu página para reservar online",
    ],
  },
  salon: {
    Icon: Users,
    mesh: "mesh-primary",
    points: [
      "Hasta 5 profesionales",
      "Horario y servicios de cada uno",
      "Reportes por profesional",
    ],
  },
  salon_large: {
    Icon: Building2,
    mesh: "mesh-violet",
    points: [
      "Profesionales sin límite",
      "Horario y servicios de cada uno",
      "Reportes por profesional",
    ],
  },
  trips: {
    Icon: Bus,
    mesh: "mesh-info",
    points: [
      "Salidas y asientos sin límite",
      "Anticipos y lista para el chofer",
      "Tu página para vender pasajes",
    ],
  },
};

const INCLUDED = [
  "Turnos, clientes y salidas ilimitados",
  "Recordatorios por WhatsApp",
  "Reportes del negocio",
  "Campañas para recuperar clientes",
  "App para Android y web",
];

const CONDITIONS: { Icon: LucideIcon; title: string; detail: string }[] = [
  {
    Icon: Sparkles,
    title: `${TRIAL_DAYS} días gratis`,
    detail: "Pruebas todo sin pagar y sin dar una tarjeta.",
  },
  {
    Icon: Banknote,
    title: "Pagas en USD",
    detail: "Por transferencia o en efectivo. Nos escribes por WhatsApp y listo.",
  },
  {
    Icon: CalendarClock,
    title: `${LICENSE_GRACE_DAYS} días de margen`,
    detail: "Si te atrasas con el pago, la app sigue funcionando esos días.",
  },
  {
    Icon: Gift,
    title: `Recomienda y gana ${REFERRAL_DAYS.regular} días`,
    detail: "Por cada negocio que traigas y pague su primer periodo.",
  },
];

const PERIOD_UNIT: Record<BillingPeriod, string> = {
  monthly: "al mes",
  quarterly: "cada 3 meses",
  semiannual: "cada 6 meses",
  annual: "al año",
};

export interface PricingSectionProps {
  ctaLabel: string;
  onCta: () => void;
}

/**
 * Landing pricing: the four plans with a billing period switch. Every amount
 * comes from config/license-pricing.ts, the same list the app charges with.
 */
export function PricingSection({ ctaLabel, onCta }: PricingSectionProps) {
  const [period, setPeriod] = useState<BillingPeriod>("monthly");
  const periodInfo = BILLING_PERIOD_INFO[period];
  const freeMonths = (info: { covered: number; charged: number }) =>
    info.covered - info.charged;

  return (
    <section id="pricing" className="px-5 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <div className="text-xs font-bold uppercase tracking-[0.08em] text-primary-600">
            Precios
          </div>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            Pagas según el tamaño de tu negocio.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-foreground-muted">
            Todo incluido en todos los planes. Empiezas con {TRIAL_DAYS} días
            gratis.
          </p>
        </div>

        {/* Billing period switch */}
        <div className="mt-8 flex justify-center">
          <div
            role="radiogroup"
            aria-label="Cada cuánto pagas"
            className="grid w-full max-w-md grid-cols-2 gap-1 rounded-2xl border border-border bg-surface p-1 sm:inline-flex sm:w-auto sm:max-w-none sm:rounded-full"
          >
            {BILLING_PERIODS.map((option) => {
              const info = BILLING_PERIOD_INFO[option];
              const selected = option === period;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPeriod(option)}
                  className={`flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition-colors sm:rounded-full sm:px-4 ${
                    selected
                      ? "mesh-primary text-white shadow-glow-primary"
                      : "text-foreground-muted hover:text-foreground"
                  }`}
                >
                  {info.label}
                  {freeMonths(info) > 0 && (
                    <span
                      className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                        selected
                          ? "bg-white/25 text-white"
                          : "bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-400"
                      }`}
                    >
                      {freeMonths(info)} meses gratis
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Plans */}
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {LICENSE_PLANS.map((plan) => {
            const info = LICENSE_PLAN_INFO[plan];
            const { Icon, mesh, points } = PLAN_DETAILS[plan];
            const amount = licensePeriodAmount(plan, period);
            const perMonth = amount / periodInfo.covered;
            return (
              <Card key={plan} className="flex flex-col p-6">
                <div
                  className={`${mesh} flex size-11 items-center justify-center rounded-xl text-white`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-extrabold tracking-tight text-foreground">
                  {info.label}
                </h3>
                <p className="mt-0.5 min-h-10 text-sm text-foreground-muted">
                  {info.audience}
                </p>
                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-4xl font-extrabold tracking-tight text-foreground">
                    {formatUsd(amount).replace(" USD", "")}
                  </span>
                  <span className="text-sm text-foreground-muted">
                    USD {PERIOD_UNIT[period]}
                  </span>
                </div>
                <p className="mt-1 min-h-4 text-xs font-semibold text-success-700 dark:text-success-400">
                  {freeMonths(periodInfo) > 0
                    ? `Te sale a ${formatUsd(perMonth)} al mes`
                    : ""}
                </p>
                <ul className="mt-4 flex-1 space-y-2.5">
                  {points.map((point) => (
                    <li
                      key={point}
                      className="flex items-start gap-2 text-sm text-foreground-muted"
                    >
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600 dark:text-success-400" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Button
                  variant={plan === "salon" ? "mesh-primary" : "soft"}
                  size="lg"
                  className="mt-6 w-full justify-center"
                  onClick={onCta}
                >
                  {ctaLabel}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Second module */}
        <Card className="mt-5 flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-bold text-foreground">
              ¿Das turnos y además vendes pasajes?
            </h3>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Usa las dos cosas en el mismo negocio: tu plan de turnos más{" "}
              {formatUsd(SECOND_MODULE_PRICE)} al mes. Por ejemplo, Personal con
              pasajes son{" "}
              {formatUsd(licenseMonthlyPrice("personal", { secondModule: true }))}{" "}
              al mes.
            </p>
          </div>
          <span className="shrink-0 self-start rounded-full bg-primary-100 px-3 py-1 text-sm font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 sm:self-center">
            +{formatUsd(SECOND_MODULE_PRICE)} al mes
          </span>
        </Card>

        {/* Included in every plan */}
        <ul className="mt-8 flex flex-wrap justify-center gap-x-5 gap-y-2">
          {INCLUDED.map((item) => (
            <li
              key={item}
              className="flex items-center gap-1.5 text-sm text-foreground-muted"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success-600 dark:text-success-400" />
              {item}
            </li>
          ))}
        </ul>

        {/* Conditions */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CONDITIONS.map(({ Icon, title, detail }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-surface p-4"
            >
              <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              <div className="mt-2 text-sm font-bold text-foreground">
                {title}
              </div>
              <p className="mt-0.5 text-sm text-foreground-muted">{detail}</p>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-foreground-muted">
          Precios en dólares estadounidenses. El pago anual cubre 12 meses y
          cuesta 10. Consulta los{" "}
          <Link className="underline" href="/terms">
            Términos y Condiciones
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
