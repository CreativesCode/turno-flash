/**
 * License price list (USD). The single place the app reads prices from: the
 * admin panel, Suscripción and the landing page.
 *
 * The database charges with the same numbers (migration 074:
 * license_plan_monthly_price, license_period_months, license_grace_days).
 * Amounts and covered dates of a real payment always come from the database
 * (license_payment_quote); this file is only for displaying the list.
 */

export const LICENSE_PLANS = ["personal", "salon", "salon_large", "trips"] as const;
export type LicensePlan = (typeof LICENSE_PLANS)[number];

export type LicensePhase = "pending" | "trial" | "paid";

export const BILLING_PERIODS = ["monthly", "quarterly", "semiannual", "annual"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];

/** Free trial granted when a business signs up, in days. */
export const TRIAL_DAYS = 15;

/** Days a business keeps working after its license ends. */
export const LICENSE_GRACE_DAYS = 5;

/** The owner starts getting notices this many days before the license ends. */
export const LICENSE_NOTICE_DAYS_BEFORE = 2;

/** Added to the plan of a business that uses appointments and trips. */
export const SECOND_MODULE_PRICE = 3;

/** Months the founder price stays fixed, counted from the first payment. */
export const FOUNDER_LOCK_MONTHS = 24;

/** Days added to whoever referred a business, once it pays its first period. */
export const REFERRAL_DAYS = { regular: 10, founder: 15 } as const;

export interface LicensePlanInfo {
  label: string;
  audience: string;
  price: number;
  founderPrice: number;
  /** Active professionals allowed; null means no limit. */
  staffLimit: number | null;
  /** Whether the plan is for businesses that take appointments. */
  appointments: boolean;
}

export const LICENSE_PLAN_INFO: Record<LicensePlan, LicensePlanInfo> = {
  personal: {
    label: "Personal",
    audience: "Trabajas por tu cuenta",
    price: 5,
    founderPrice: 3,
    staffLimit: 1,
    appointments: true,
  },
  salon: {
    label: "Salón",
    audience: "Un negocio con equipo, hasta 5 profesionales",
    price: 10,
    founderPrice: 6,
    staffLimit: 5,
    appointments: true,
  },
  salon_large: {
    label: "Salón grande",
    audience: "Más de 5 profesionales",
    price: 15,
    founderPrice: 9,
    staffLimit: null,
    appointments: true,
  },
  trips: {
    label: "Pasajes",
    audience: "Gestores y agencias que venden asientos",
    price: 5,
    founderPrice: 3,
    staffLimit: null,
    appointments: false,
  },
};

export interface BillingPeriodInfo {
  label: string;
  /** Months of access. */
  covered: number;
  /** Months paid for (annual pays 10 for 12). */
  charged: number;
}

export const BILLING_PERIOD_INFO: Record<BillingPeriod, BillingPeriodInfo> = {
  monthly: { label: "Mensual", covered: 1, charged: 1 },
  quarterly: { label: "Trimestral", covered: 3, charged: 3 },
  semiannual: { label: "Semestral", covered: 6, charged: 6 },
  annual: { label: "Anual", covered: 12, charged: 10 },
};

export function isLicensePlan(value: unknown): value is LicensePlan {
  return LICENSE_PLANS.includes(value as LicensePlan);
}

export function isBillingPeriod(value: unknown): value is BillingPeriod {
  return BILLING_PERIODS.includes(value as BillingPeriod);
}

interface PriceOptions {
  founder?: boolean;
  secondModule?: boolean;
}

/** Monthly price of a plan in USD. */
export function licenseMonthlyPrice(
  plan: LicensePlan,
  { founder = false, secondModule = false }: PriceOptions = {}
): number {
  const info = LICENSE_PLAN_INFO[plan];
  return (
    (founder ? info.founderPrice : info.price) +
    (secondModule ? SECOND_MODULE_PRICE : 0)
  );
}

/** What a whole billing period costs in USD. */
export function licensePeriodAmount(
  plan: LicensePlan,
  period: BillingPeriod,
  options: PriceOptions = {}
): number {
  return licenseMonthlyPrice(plan, options) * BILLING_PERIOD_INFO[period].charged;
}

/** "5 USD", "12,50 USD" */
export function formatUsd(amount: number): string {
  return `${new Intl.NumberFormat("es", {
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)} USD`;
}

export const LICENSE_PHASE_LABEL: Record<LicensePhase, string> = {
  pending: "En preparación",
  trial: "Prueba gratis",
  paid: "Pago",
};

/** "6 de noviembre de 2026" for a `YYYY-MM-DD` day (no timezone shift). */
export function formatLicenseDay(day: string): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date)).toLocaleDateString("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** The Cuban calendar day (`YYYY-MM-DD`) of a timestamp. */
export function licenseDayOf(timestamp: string | Date): string {
  return new Date(timestamp).toLocaleDateString("en-CA", {
    timeZone: "America/Havana",
  });
}

/** Adds days to a `YYYY-MM-DD` day. */
export function addLicenseDays(day: string, days: number): string {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + days))
    .toISOString()
    .slice(0, 10);
}
