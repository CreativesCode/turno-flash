"use client";

import { Button, SegmentedControl } from "@/components/ui";
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
  CalendarClock,
  Check,
  Gift,
  type LucideIcon,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/** What sets each plan apart; everything else is included in all of them. */
const PLAN_POINTS: Record<LicensePlan, string[]> = {
  personal: [
    "1 profesional",
    "Agenda, clientes y servicios",
    "Tu página para reservar online",
  ],
  salon: [
    "Hasta 5 profesionales",
    "Horario y servicios de cada uno",
    "Reportes por profesional",
  ],
  salon_large: [
    "Profesionales sin límite",
    "Horario y servicios de cada uno",
    "Reportes por profesional",
  ],
  trips: [
    "Salidas y asientos sin límite",
    "Anticipos y lista para el chofer",
    "Tu página para vender pasajes",
  ],
};

/** The plan most businesses pick: shown inverted. */
const FEATURED_PLAN: LicensePlan = "salon";

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
    <section
      id="pricing"
      className="mx-auto max-w-[1240px] scroll-mt-20 px-5 pt-16 sm:px-8 sm:pt-24 lg:px-12 lg:pt-[120px]"
    >
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="text-sm font-semibold text-primary-700 dark:text-primary-400">
            Precios
          </div>
          <h2 className="mt-2.5 font-display text-[40px] leading-none text-foreground lg:text-[68px]">
            Pagas según el tamaño de tu negocio.
          </h2>
          <p className="mt-4 text-body text-foreground-muted">
            Todo incluido en todos los planes. Empiezas con {TRIAL_DAYS} días
            gratis.
          </p>
        </div>
        <div className="max-w-full overflow-x-auto">
          <SegmentedControl
            label="Cada cuánto pagas"
            value={period}
            onChange={setPeriod}
            options={BILLING_PERIODS.map((option) => {
              const info = BILLING_PERIOD_INFO[option];
              return {
                value: option,
                label: (
                  <>
                    {info.label}
                    {freeMonths(info) > 0 && (
                      <span className="rounded-tag bg-primary-100 px-1.5 py-0.5 text-caption text-primary-700 dark:bg-primary-900 dark:text-primary-400">
                        {freeMonths(info)} meses gratis
                      </span>
                    )}
                  </>
                ),
              };
            })}
          />
        </div>
      </div>

      {/* Plans */}
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {LICENSE_PLANS.map((plan) => {
          const info = LICENSE_PLAN_INFO[plan];
          const amount = licensePeriodAmount(plan, period);
          const perMonth = amount / periodInfo.covered;
          const featured = plan === FEATURED_PLAN;
          const muted = featured
            ? "text-inverse-foreground/70"
            : "text-foreground-muted";
          const accent = featured
            ? "text-primary-400 dark:text-primary-700"
            : "text-primary-700 dark:text-primary-400";
          return (
            <div
              key={plan}
              className={`flex flex-col rounded-[24px] border p-[26px] ${
                featured
                  ? "border-inverse bg-inverse text-inverse-foreground"
                  : "border-border bg-surface text-foreground"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">{info.label}</h3>
                {featured && (
                  <span className="rounded-tag bg-primary-500 px-2 py-0.5 text-caption font-semibold text-primary-950">
                    El más elegido
                  </span>
                )}
              </div>
              <p className={`mt-0.5 min-h-10 text-sm ${muted}`}>
                {info.audience}
              </p>
              <div className="mt-4 flex items-baseline gap-1.5">
                <span className="font-display text-[64px] leading-[0.9]">
                  {formatUsd(amount).replace(" USD", "")}
                </span>
                <span className={`text-sm ${muted}`}>
                  USD {PERIOD_UNIT[period]}
                </span>
              </div>
              <p className={`mt-2 min-h-5 text-meta font-semibold ${accent}`}>
                {freeMonths(periodInfo) > 0
                  ? `Te sale a ${formatUsd(perMonth)} al mes`
                  : ""}
              </p>
              <ul className="mt-4 flex-1 space-y-2.5">
                {PLAN_POINTS[plan].map((point) => (
                  <li
                    key={point}
                    className={`flex items-start gap-2 text-sm ${muted}`}
                  >
                    <Check className={`mt-0.5 size-4 shrink-0 ${accent}`} />
                    {point}
                  </li>
                ))}
              </ul>
              {featured ? (
                <button
                  type="button"
                  onClick={onCta}
                  className="mt-6 flex h-[54px] w-full cursor-pointer items-center justify-center rounded-[14px] bg-primary-500 text-[16px] font-semibold text-primary-950 transition-[filter] hover:brightness-95"
                >
                  {ctaLabel}
                </button>
              ) : (
                <Button
                  variant="secondary"
                  size="lg"
                  className="mt-6 w-full"
                  onClick={onCta}
                >
                  {ctaLabel}
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* Second module */}
      <div className="mt-3 flex flex-col gap-3 rounded-[24px] border border-border bg-surface p-[26px] sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lead font-semibold text-foreground">
            ¿Das turnos y además vendes pasajes?
          </h3>
          <p className="mt-1 text-sm text-foreground-muted">
            Usa las dos cosas en el mismo negocio: tu plan de turnos más{" "}
            {formatUsd(SECOND_MODULE_PRICE)} al mes. Por ejemplo, Personal con
            pasajes son{" "}
            {formatUsd(licenseMonthlyPrice("personal", { secondModule: true }))}{" "}
            al mes.
          </p>
        </div>
        <span className="shrink-0 self-start rounded-tag bg-surface-2 px-3 py-1.5 font-mono text-meta font-medium text-foreground sm:self-center">
          +{formatUsd(SECOND_MODULE_PRICE)} / mes
        </span>
      </div>

      {/* Conditions */}
      <div className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
        {CONDITIONS.map(({ Icon, title, detail }) => (
          <div key={title}>
            <Icon className="size-[22px] text-primary" />
            <div className="mt-2.5 text-body font-semibold text-foreground">
              {title}
            </div>
            <p className="mt-0.5 text-sm text-foreground-muted">{detail}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-meta text-foreground-subtle">
        {INCLUDED.join(" · ")}. Precios en dólares estadounidenses. El pago
        anual cubre 12 meses y cuesta 10. Consulta los{" "}
        <Link className="underline" href="/terms">
          Términos y Condiciones
        </Link>
        .
      </p>
    </section>
  );
}
