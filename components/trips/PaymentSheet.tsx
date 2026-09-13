"use client";

import { useMoney } from "@/hooks/useMoney";

import {
  Button,
  Field,
  Sheet,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import type { TripBookingWithCustomer } from "@/types/trips";
import { useState } from "react";

export interface PaymentSheetProps {
  /** Never null: the parent mounts this with a key so state starts fresh. */
  booking: TripBookingWithCustomer;
  onClose: () => void;
  onSave: (payload: {
    amountPaid: number;
    method: string;
    extraDescription: string;
    extraAmount: number;
  }) => void | Promise<void>;
  isSaving: boolean;
}

/**
 * What the passenger actually handed over. The common flow is a deposit by
 * transfer and the rest in cash on the bus, so the sheet offers both shortcuts
 * and still allows any amount in between.
 */
export function PaymentSheet({
  booking,
  onClose,
  onSave,
  isSaving,
}: PaymentSheetProps) {
  const { format: money } = useMoney();
  // Mounted per booking (key), so the initial state is the booking itself and
  // no effect has to chase prop changes.
  const [amount, setAmount] = useState<number | "">(booking.amount_paid || "");
  const [method, setMethod] = useState(booking.deposit_method ?? "");
  const [extraDescription, setExtraDescription] = useState(
    booking.extra_description ?? ""
  );
  const [extraAmount, setExtraAmount] = useState<number | "">(
    booking.extra_amount || ""
  );

  const extra = extraAmount === "" ? 0 : extraAmount;
  const seatsTotal = booking.price_total ?? 0;
  const total = seatsTotal + extra;
  const deposit = booking.deposit_amount ?? 0;
  const paid = amount === "" ? 0 : amount;
  const pending = Math.max(total - paid, 0);

  return (
    <Sheet
      open
      onClose={onClose}
      title="Registrar cobro"
      subtitle={`${booking.booking_number ?? ""} · ${booking.seats} asiento(s) · asientos ${money(seatsTotal)}`}
      maxWidthClass="sm:max-w-lg"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setAmount(deposit)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Cobré el anticipo ({money(deposit)})
          </button>
          <button
            type="button"
            onClick={() => setAmount(total)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Cobré todo ({money(total)})
          </button>
          <button
            type="button"
            onClick={() => setAmount(0)}
            className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground-muted transition-colors hover:bg-muted"
          >
            No pagó nada
          </button>
        </div>

        <Field label="Cobrado" hint="Puedes escribir cualquier monto.">
          <input
            type="number"
            min={0}
            step="0.01"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value === "" ? "" : Number(e.target.value))
            }
            className={inputClasses}
            autoFocus
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Extra (opcional)" hint="Aeropuerto, otro destino, equipaje…">
            <input
              type="text"
              value={extraDescription}
              onChange={(e) => setExtraDescription(e.target.value)}
              className={inputClasses}
              placeholder="Llevarlo al aeropuerto"
            />
          </Field>
          <Field label="Costo del extra">
            <input
              type="number"
              min={0}
              step="0.01"
              value={extraAmount}
              onChange={(e) =>
                setExtraAmount(e.target.value === "" ? "" : Number(e.target.value))
              }
              className={inputClasses}
            />
          </Field>
        </div>

        <Field label="Cómo pagó (opcional)">
          <input
            type="text"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className={inputClasses}
            placeholder="Transferencia, efectivo al chofer…"
          />
        </Field>

        <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
          {extra > 0 && (
            <div className="mb-1 flex items-center justify-between text-foreground-muted">
              <span>Asientos {money(seatsTotal)} + extra {money(extra)}</span>
              <span className="font-semibold text-foreground">
                {money(total)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-foreground-muted">Falta por cobrar</span>
            <span
              className={`text-sm font-extrabold ${
                pending === 0
                  ? "text-success-600 dark:text-success-300"
                  : "text-warning-600 dark:text-warning-300"
              }`}
            >
              {money(pending)}
            </span>
          </div>
          {pending === 0 && total > 0 && (
            <p className="mt-1 text-foreground-muted">Pagó el viaje completo.</p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 justify-center"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="mesh-primary"
            onClick={() =>
              onSave({
                amountPaid: paid,
                method,
                extraDescription,
                extraAmount: extra,
              })
            }
            disabled={isSaving}
            className="flex-2 justify-center"
          >
            {isSaving ? "Guardando…" : "Guardar cobro"}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
