"use client";

import {
  Button,
  Field,
  Select,
  Sheet,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks";
import { useMoney } from "@/hooks/useMoney";
import { useRegisterAppointmentPayment } from "@/hooks/useAppointmentPayments.query";
import { appointmentPaymentSchema } from "@/schemas/appointment-payment.schema";
import {
  RECEIPT_MAX_BYTES,
  RECEIPT_TYPES,
  type PaymentMethod,
} from "@/services/appointment-payments.service";
import type { AppointmentWithDetails } from "@/types/appointments";
import { fromLocalDateTimeInput, toLocalDateTimeInput } from "@/utils/deposit";
import { useState } from "react";

type Errors = Partial<Record<"amount" | "paidAt" | "methodOther" | "reference" | "notes" | "receipt", string>>;

export const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia (Transfermóvil / EnZona)" },
  { value: "card", label: "Tarjeta" },
  { value: "other", label: "Otro" },
];

/**
 * "Registrar pago" (TUR0008): amount, date, method, reference, notes and an
 * optional receipt. With `deposit`, it registers the deposit of the appointment.
 */
export function RegisterPaymentSheet({
  open,
  onClose,
  appointment: a,
  deposit = false,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentWithDetails;
  deposit?: boolean;
  onSaved: (fresh: AppointmentWithDetails | null) => void;
}) {
  const toast = useToast();
  const { profile } = useAuth();
  const canManage = profile?.role === "owner" || profile?.role === "admin";
  const { format: money } = useMoney();
  const register = useRegisterAppointmentPayment();
  const suggested = deposit ? a.deposit_amount : a.amount_pending;
  const [amount, setAmount] = useState(suggested ? String(suggested) : "");
  const [paidAt, setPaidAt] = useState(() => toLocalDateTimeInput(new Date().toISOString()));
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [methodOther, setMethodOther] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [receipt, setReceipt] = useState<File | null>(null);
  const [errors, setErrors] = useState<Errors>({});

  const pickReceipt = (file: File | null) => {
    setErrors((prev) => ({ ...prev, receipt: undefined }));
    if (file && !RECEIPT_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
      setErrors((prev) => ({ ...prev, receipt: "Tiene que ser una foto o un PDF" }));
      return;
    }
    // Photos are made smaller before uploading; a PDF goes as it is
    if (file && file.type === "application/pdf" && file.size > RECEIPT_MAX_BYTES) {
      setErrors((prev) => ({ ...prev, receipt: "El PDF pesa más de 5 MB" }));
      return;
    }
    setReceipt(file);
  };

  const save = async () => {
    const parsed = appointmentPaymentSchema.safeParse({
      amount: amount === "" ? undefined : Number(amount),
      paidAt: fromLocalDateTimeInput(paidAt) ?? "",
      method,
      methodOther,
      reference,
      notes,
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        next[key] ??= issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    const v = parsed.data;
    try {
      const fresh = await register.mutateAsync({
        appointment: a,
        payment: {
          amount: v.amount,
          paidAt: v.paidAt,
          method: v.method,
          methodOther: v.method === "other" ? v.methodOther : null,
          reference: v.reference || null,
          notes: v.notes || null,
          receipt,
          isDeposit: deposit,
        },
      });
      toast.success(deposit ? "Anticipo registrado" : "Pago registrado", money(v.amount));
      onSaved(fresh);
    } catch (err) {
      toast.error("No se pudo registrar", err instanceof Error ? err.message : undefined);
    }
  };

  const busy = register.isPending;

  return (
    <Sheet
      open={open}
      onClose={busy ? () => {} : onClose}
      title={deposit ? "Registrar anticipo" : "Registrar pago"}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="Importe">
            <input
              type="number"
              inputMode="decimal"
              min={0.01}
              step={0.01}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!errors.amount}
              className={inputClasses}
            />
          </Field>
          <Field label="Fecha">
            <input
              type="datetime-local"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              aria-invalid={!!errors.paidAt}
              className={inputClasses}
            />
          </Field>
        </div>
        <FieldError message={errors.amount ?? errors.paidAt} />

        <Field label="Método">
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {METHOD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        </Field>
        {method === "other" && (
          <Field label="¿Cuál?">
            <input
              value={methodOther}
              maxLength={60}
              onChange={(e) => setMethodOther(e.target.value)}
              aria-invalid={!!errors.methodOther}
              className={inputClasses}
              placeholder="Por ejemplo, Zelle"
            />
            <FieldError message={errors.methodOther} />
          </Field>
        )}

        <Field label="Referencia" hint="Opcional: número de la transferencia o del recibo.">
          <input
            value={reference}
            maxLength={100}
            onChange={(e) => setReference(e.target.value)}
            className={inputClasses}
          />
        </Field>

        <Field label="Observaciones" hint="Opcional.">
          <textarea
            rows={2}
            maxLength={500}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={inputClasses}
          />
        </Field>

        <Field
          label="Comprobante"
          hint="Opcional: foto o PDF de hasta 5 MB. Solo lo ve tu negocio."
        >
          <input
            type="file"
            accept="image/*,application/pdf"
            onChange={(e) => pickReceipt(e.target.files?.[0] ?? null)}
            className="block w-full text-meta text-foreground-muted file:mr-3 file:cursor-pointer file:rounded-control file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-meta file:font-semibold file:text-foreground"
          />
          <FieldError message={errors.receipt} />
        </Field>

        {deposit && a.deposit_status !== "verified" && (
          <p className="text-caption text-foreground-muted">
            {canManage
              ? "El anticipo queda recibido y el turno, confirmado."
              : "El anticipo queda registrado y el dueño lo verifica."}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy} className="flex-1 justify-center">
            Cancelar
          </Button>
          <Button type="submit" disabled={busy} className="flex-2 justify-center">
            {busy ? "Guardando…" : "Registrar"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-caption text-danger-600 dark:text-danger-400">{message}</p>
  );
}
