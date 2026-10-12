"use client";

import { Badge, Card } from "@/components/ui";
import { useSupportWhatsAppUrl } from "@/hooks/useSupportWhatsAppUrl";
import {
  BILLING_PERIOD_INFO,
  BILLING_PERIODS,
  LICENSE_GRACE_DAYS,
  LICENSE_PHASE_LABEL,
  LICENSE_PLAN_INFO,
  REFERRAL_DAYS,
  formatLicenseDay,
  formatUsd,
  licenseDayOf,
  licenseMonthlyPrice,
  licensePeriodAmount,
} from "@/config/license-pricing";
import { useIsStoreApp } from "@/hooks/useIsStoreApp";
import { useOrganizationLicense } from "@/hooks/useLicense";
import { Gift, Wallet } from "lucide-react";

/**
 * What the owner pays and until when: plan, price per billing period, how to
 * pay and how to earn days by referring another business.
 *
 * In the store app it shows only the plan and the dates: no prices and no
 * way to pay (see useIsStoreApp).
 */
export function LicensePlanSummary() {
  const { data: license } = useOrganizationLicense();
  const storeApp = useIsStoreApp();
  const planUrl = useSupportWhatsAppUrl("plan");
  if (!license) return null;

  const info = LICENSE_PLAN_INFO[license.plan];
  const today = licenseDayOf(new Date());
  const founderActive =
    license.founder &&
    (!license.founderPriceUntil || license.founderPriceUntil >= today);
  const priceOptions = {
    founder: founderActive,
    secondModule: license.secondModule,
  };
  const monthly = licenseMonthlyPrice(license.plan, priceOptions);
  const expiresOn = license.licenseEndDate
    ? licenseDayOf(license.licenseEndDate)
    : null;

  return (
    <>
      <Card className="mb-6 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-foreground-muted">
              Tu plan
            </p>
            <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-foreground">
              {info.label}
              {license.secondModule ? " + Pasajes" : ""}
            </h2>
            <p className="mt-0.5 text-sm text-foreground-muted">
              {info.staffLimit === null
                ? "Sin límite de profesionales."
                : info.staffLimit === 1
                  ? "Para 1 profesional activo."
                  : `Hasta ${info.staffLimit} profesionales activos.`}
            </p>
          </div>
          <Badge variant={license.phase === "paid" ? "success" : "warning"}>
            {LICENSE_PHASE_LABEL[license.phase]}
          </Badge>
        </div>

        {!storeApp && (
          <>
        <p className="mt-4 text-3xl font-semibold tracking-tight text-foreground">
          {formatUsd(monthly)}
          <span className="ml-1 text-sm font-medium text-foreground-muted">
            al mes
          </span>
        </p>
        {founderActive && (
          <p className="mt-1 text-xs text-foreground-muted">
            Precio fundador
            {license.founderPriceUntil
              ? ` hasta el ${formatLicenseDay(license.founderPriceUntil)}`
              : ", fijo 24 meses desde tu primer pago"}
            . Después, {formatUsd(licenseMonthlyPrice(license.plan, { secondModule: license.secondModule }))} al mes.
          </p>
        )}
          </>
        )}

        {license.phase !== "pending" && expiresOn && (
          <p className="mt-3 text-sm text-foreground">
            Tienes acceso hasta el{" "}
            <span className="font-semibold">{formatLicenseDay(expiresOn)}</span>
            . Después tienes {LICENSE_GRACE_DAYS} días de margen
            {storeApp ? "" : " para pagar"} antes de que la app se bloquee.
          </p>
        )}

        {!storeApp && (
          <>
        <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BILLING_PERIODS.map((period) => {
            const periodInfo = BILLING_PERIOD_INFO[period];
            const amount = licensePeriodAmount(license.plan, period, priceOptions);
            const saved = monthly * periodInfo.covered - amount;
            return (
              <li
                key={period}
                className="rounded-lg border border-border bg-surface-2 px-3 py-2.5"
              >
                <div className="text-xs text-foreground-muted">
                  {periodInfo.label}
                </div>
                <div className="text-sm font-semibold text-foreground">
                  {formatUsd(amount)}
                </div>
                {saved > 0 && (
                  <div className="text-caption font-semibold text-success-700 dark:text-success-400">
                    Ahorras {formatUsd(saved)}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        <a
          href={planUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
        >
          Pedir un cambio de plan
        </a>
          </>
        )}
      </Card>

      {!storeApp && (
      <Card className="mb-6 p-5">
        <div className="flex items-start gap-3">
          <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-foreground-muted" />
          <div>
            <p className="text-sm font-medium text-foreground">Cómo se paga</p>
            <p className="mt-0.5 text-sm text-foreground-muted">
              En USD, por transferencia o en efectivo. Escríbenos por WhatsApp,
              te decimos cómo, y en cuanto registramos tu pago se extiende tu
              acceso. Pagar antes de tiempo no te quita días.
            </p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-3">
          <Gift className="mt-0.5 h-5 w-5 shrink-0 text-foreground-muted" />
          <div>
            <p className="text-sm font-medium text-foreground">
              Recomienda y gana días
            </p>
            <p className="mt-0.5 text-sm text-foreground-muted">
              Por cada negocio que entre recomendado por ti y pague su primer
              periodo, sumamos{" "}
              {founderActive ? REFERRAL_DAYS.founder : REFERRAL_DAYS.regular}{" "}
              días a tu acceso. Dile que nos diga tu nombre al registrarse.
            </p>
          </div>
        </div>
      </Card>
      )}
    </>
  );
}
