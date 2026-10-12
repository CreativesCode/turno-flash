"use client";

import { Card } from "@/components/ui";
import {
  BILLING_PERIOD_INFO,
  LICENSE_PLAN_INFO,
  formatLicenseDay,
  formatUsd,
  isBillingPeriod,
  isLicensePlan,
  licenseDayOf,
} from "@/config/license-pricing";
import {
  useLicenseNotices,
  useLicensePayments,
  useReferredOrganizations,
} from "@/hooks/useLicenseBilling.query";
import { Receipt } from "lucide-react";

const NOTICE_LABEL: Record<string, string> = {
  owner_reminder: "Al dueño: está por vencer",
  owner_due: "Al dueño: vence hoy",
  owner_grace: "Al dueño: día de margen",
  owner_blocked: "Al dueño: bloqueado",
  admin_due: "A ti: vence hoy",
  admin_blocked: "A ti: bloqueado",
};

function noticeStatusLabel(status: string, failureCode: string | null): string {
  if (failureCode === "no_phone") return "Sin WhatsApp";
  if (status === "sent") return failureCode === "unconfirmed" ? "Enviado (sin confirmar)" : "Enviado";
  if (status === "failed") return "No se envió";
  return "Pendiente";
}

export interface LicensePaymentsCardProps {
  organizationId: string;
}

/** Payments recorded for a business and the businesses it referred. Admin only. */
export function LicensePaymentsCard({ organizationId }: LicensePaymentsCardProps) {
  const payments = useLicensePayments(organizationId);
  const referred = useReferredOrganizations(organizationId);
  const notices = useLicenseNotices(organizationId);

  const rows = payments.data ?? [];
  const total = rows.reduce((sum, row) => sum + Number(row.amount_usd), 0);

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-foreground-muted">
          <Receipt className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">Pagos</div>
          <p className="mt-0.5 text-xs text-foreground-muted">
            {payments.isPending
              ? "Cargando…"
              : rows.length === 0
                ? "Todavía no ha pagado ningún periodo."
                : `${rows.length} ${rows.length === 1 ? "pago" : "pagos"} · ${formatUsd(total)} en total`}
          </p>
        </div>
      </div>

      {payments.isError && (
        <p className="mt-3 text-sm text-danger-700 dark:text-danger-400">
          No pudimos cargar los pagos.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-border">
          {rows.map((row) => (
            <li key={row.id} className="py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-bold text-foreground">
                  {formatUsd(Number(row.amount_usd))}
                </span>
                <span className="text-xs text-foreground-muted">
                  {formatLicenseDay(licenseDayOf(row.created_at))}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-foreground-muted">
                {isLicensePlan(row.license_plan)
                  ? LICENSE_PLAN_INFO[row.license_plan].label
                  : row.license_plan}
                {row.second_module ? " + segundo módulo" : ""} ·{" "}
                {isBillingPeriod(row.billing_period)
                  ? BILLING_PERIOD_INFO[row.billing_period].label
                  : row.billing_period}
                {row.founder_price ? " · precio fundador" : ""}
              </p>
              <p className="text-xs text-foreground-muted">
                Cubre del {formatLicenseDay(row.covered_from)} al{" "}
                {formatLicenseDay(row.covered_until)}
              </p>
              {row.referral_days_granted ? (
                <p className="text-xs text-foreground-muted">
                  Dio {row.referral_days_granted} días a quien lo recomendó
                </p>
              ) : null}
              {row.note && (
                <p className="mt-0.5 text-xs italic text-foreground-subtle">
                  {row.note}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {(referred.data?.length ?? 0) > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-foreground-muted">
            Negocios que recomendó
          </div>
          <ul className="mt-1.5 flex flex-col gap-1">
            {referred.data?.map((org) => (
              <li
                key={org.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate text-foreground">{org.name}</span>
                <span className="shrink-0 text-xs text-foreground-muted">
                  {org.credited ? "Días sumados" : "Aún no ha pagado"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(notices.data?.length ?? 0) > 0 && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-foreground-muted">
            Avisos de cobro por WhatsApp
          </div>
          <ul className="mt-1.5 flex flex-col gap-1">
            {notices.data?.map((notice) => (
              <li
                key={notice.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="min-w-0 truncate text-foreground">
                  {NOTICE_LABEL[notice.kind] ?? notice.kind}
                  <span className="ml-1.5 text-xs text-foreground-muted">
                    {formatLicenseDay(licenseDayOf(notice.created_at))}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-foreground-muted">
                  {noticeStatusLabel(notice.status, notice.failure_code)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
