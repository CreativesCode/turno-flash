"use client";

import { Button, Field, Sheet, SheetFooter, sheetInputClasses } from "@/components/ui";
import {
  BILLING_PERIOD_INFO,
  BILLING_PERIODS,
  type BillingPeriod,
  LICENSE_PLAN_INFO,
  formatLicenseDay,
  formatUsd,
} from "@/config/license-pricing";
import { useToast } from "@/hooks";
import {
  useLicenseQuote,
  useRecordLicensePayment,
} from "@/hooks/useLicenseBilling.query";
import { useState } from "react";

export interface RecordPaymentSheetProps {
  open: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  /** Period of the last payment, offered first. */
  defaultPeriod: BillingPeriod | null;
  onRecorded: () => void;
}

/**
 * Records a license payment. The amount and the covered dates come from the
 * database (license_payment_quote), so what the admin confirms is exactly
 * what record_license_payment charges.
 */
export function RecordPaymentSheet({
  open,
  onClose,
  organizationId,
  organizationName,
  defaultPeriod,
  onRecorded,
}: RecordPaymentSheetProps) {
  const toast = useToast();
  const [period, setPeriod] = useState<BillingPeriod>(defaultPeriod ?? "monthly");
  const [note, setNote] = useState("");

  const quote = useLicenseQuote(organizationId, period, open);
  const recordPayment = useRecordLicensePayment(organizationId);

  const handleConfirm = async () => {
    try {
      const result = await recordPayment.mutateAsync({ period, note });
      toast.success(
        "Pago registrado",
        `${formatUsd(result.amount_usd)}. Cubre hasta el ${formatLicenseDay(result.covered_until)}.` +
          (result.referral_days
            ? ` ${result.referrer_name} gana ${result.referral_days} días por recomendarlo.`
            : "")
      );
      setNote("");
      onRecorded();
      onClose();
    } catch (error) {
      toast.error(
        "No se registró el pago",
        error instanceof Error ? error.message : undefined
      );
    }
  };

  const data = quote.data;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Registrar pago"
      subtitle={organizationName}
    >
      <div className="flex flex-col gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.05em] text-foreground-muted">
            Periodo que paga
          </div>
          <div
            role="radiogroup"
            aria-label="Periodo que paga"
            className="mt-1.5 grid grid-cols-2 gap-2"
          >
            {BILLING_PERIODS.map((option) => {
              const info = BILLING_PERIOD_INFO[option];
              const selected = period === option;
              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setPeriod(option)}
                  className={`rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-primary bg-primary-50 dark:bg-primary-900/20"
                      : "border-border bg-surface-2 hover:border-border-2"
                  }`}
                >
                  <div className="text-sm font-semibold text-foreground">
                    {info.label}
                  </div>
                  <div className="text-[11px] text-foreground-muted">
                    {info.covered === 1 ? "1 mes" : `${info.covered} meses`}
                    {info.charged < info.covered
                      ? ` · paga ${info.charged}`
                      : ""}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-4">
          {quote.isPending ? (
            <p className="text-sm text-foreground-muted">Calculando…</p>
          ) : quote.isError || !data ? (
            <p className="text-sm text-danger-700 dark:text-danger-400">
              No pudimos calcular el pago. Cierra y vuelve a intentarlo.
            </p>
          ) : (
            <>
              <div className="text-xs font-semibold uppercase tracking-wide text-foreground-muted">
                Se cobra
              </div>
              <div className="mt-0.5 text-3xl font-extrabold tracking-tight text-foreground">
                {formatUsd(data.amount_usd)}
              </div>
              <p className="mt-2 text-sm text-foreground">
                Cubre del{" "}
                <span className="font-semibold">
                  {formatLicenseDay(data.covered_from)}
                </span>{" "}
                al{" "}
                <span className="font-semibold">
                  {formatLicenseDay(data.covered_until)}
                </span>
                .
              </p>
              <p className="mt-1 text-xs text-foreground-muted">
                Plan {LICENSE_PLAN_INFO[data.license_plan].label}
                {data.second_module ? " + segundo módulo" : ""},{" "}
                {formatUsd(data.monthly_usd)} al mes
                {data.founder_price ? " (precio fundador)" : ""}.
                {data.first_payment ? " Es su primer pago." : ""}
              </p>
            </>
          )}
        </div>

        <Field label="Nota (opcional)" hint="Cómo pagó, quién lo recibió…">
          <textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={sheetInputClasses}
            placeholder="Transferencia del 12 de octubre"
          />
        </Field>

        <SheetFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={recordPayment.isPending}
            className="flex-1 justify-center"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="mesh-primary"
            onClick={handleConfirm}
            disabled={!data || quote.isFetching || recordPayment.isPending}
            className="flex-2 justify-center"
          >
            {recordPayment.isPending
              ? "Registrando…"
              : data
                ? `Registrar ${formatUsd(data.amount_usd)}`
                : "Registrar pago"}
          </Button>
        </SheetFooter>
      </div>
    </Sheet>
  );
}
