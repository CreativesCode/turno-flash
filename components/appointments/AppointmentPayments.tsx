"use client";

import { AppointmentRefunds } from "@/components/appointments/AppointmentRefunds";
import { DepositPanel } from "@/components/appointments/DepositPanel";
import { RegisterPaymentSheet } from "@/components/appointments/RegisterPaymentSheet";
import { Button, ConfirmSheet, sheetInputClasses as inputClasses } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks";
import { useMoney } from "@/hooks/useMoney";
import {
  useAppointmentPayments,
  useVoidAppointmentPayment,
} from "@/hooks/useAppointmentPayments.query";
import { voidPaymentReasonSchema } from "@/schemas/appointment-payment.schema";
import {
  AppointmentPaymentsService,
  type AppointmentPayment,
} from "@/services/appointment-payments.service";
import { TeamService } from "@/services/team.service";
import type { AppointmentWithDetails, PaymentStatus } from "@/types/appointments";
import type { DepositAction } from "@/utils/deposit";
import { PAYMENT_STATUS_LABEL, paymentMethodText } from "@/utils/payment";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("es", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const STATUS_CLASS: Record<PaymentStatus, string> = {
  unpaid: "text-foreground-muted",
  partial: "text-warning-700 dark:text-warning-400",
  paid: "text-success-700 dark:text-success-400",
};

/**
 * The money of an appointment in its detail (TUR0008): the deposit panel and
 * the payments, with the "Registrar pago" sheet. `onAppointmentChange` gets the
 * appointment as it is after a payment (totals, deposit and status change).
 */
export function AppointmentMoney({
  appointment: a,
  onDeposit,
  isDepositBusy = false,
  onAppointmentChange,
}: {
  appointment: AppointmentWithDetails;
  onDeposit: (action: DepositAction) => void | Promise<void>;
  isDepositBusy?: boolean;
  onAppointmentChange?: (fresh: AppointmentWithDetails) => void;
}) {
  const { data: payments = [] } = useAppointmentPayments(a.id);
  const [registering, setRegistering] = useState<"payment" | "deposit" | null>(null);
  const hasDepositPayment = payments.some((p) => p.is_deposit && !p.voided_at);
  const refresh = (fresh: AppointmentWithDetails | null) => {
    if (fresh) onAppointmentChange?.(fresh);
  };

  return (
    <>
      <DepositPanel
        appointment={a}
        onAction={onDeposit}
        busy={isDepositBusy}
        hasDepositPayment={hasDepositPayment}
        onRegisterDeposit={() => setRegistering("deposit")}
      />
      <PaymentsBlock
        appointment={a}
        payments={payments}
        // "Ya lo cobré" when creating, or verified before payments existed
        canRegisterDeposit={a.deposit_status === "verified" && !hasDepositPayment}
        onRegister={(deposit) => setRegistering(deposit ? "deposit" : "payment")}
        onChange={refresh}
      />
      <AppointmentRefunds appointment={a} onChange={refresh} />
      {registering && (
        <RegisterPaymentSheet
          open
          onClose={() => setRegistering(null)}
          appointment={a}
          deposit={registering === "deposit"}
          onSaved={(fresh) => {
            setRegistering(null);
            refresh(fresh);
          }}
        />
      )}
    </>
  );
}

function PaymentsBlock({
  appointment: a,
  payments,
  canRegisterDeposit,
  onRegister,
  onChange,
}: {
  appointment: AppointmentWithDetails;
  payments: AppointmentPayment[];
  canRegisterDeposit: boolean;
  onRegister: (deposit: boolean) => void;
  onChange: (fresh: AppointmentWithDetails | null) => void;
}) {
  const { format: money } = useMoney();
  const [voiding, setVoiding] = useState<AppointmentPayment | null>(null);
  const price = Number(a.price_charged ?? a.service_price ?? 0);
  const paid = Number(a.amount_paid ?? 0);
  const status = a.payment_status ?? "unpaid";
  const extra = paid - price;

  if (!price && !payments.length) return null;

  return (
    <div className="mt-3 rounded-[18px] border border-border px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-caption text-foreground-subtle">Pagos</div>
        <div className={`text-meta font-semibold ${STATUS_CLASS[status]}`}>
          {PAYMENT_STATUS_LABEL[status]}
        </div>
      </div>
      <p className="mt-[3px] text-body text-foreground">
        Pagado <strong className="font-mono tabular-nums">{money(paid)}</strong>
        {price > 0 && (
          <span className="text-foreground-muted"> de {money(price)}</span>
        )}
      </p>
      <p className="text-caption text-foreground-muted">
        {extra > 0
          ? `Cobrado de más: ${money(extra)}`
          : `Falta: ${money(Number(a.amount_pending ?? Math.max(price - paid, 0)))}`}
      </p>

      {payments.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-border border-t border-border">
          {payments.map((p) => (
            <PaymentRow key={p.id} payment={p} onVoid={() => setVoiding(p)} />
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-col gap-2">
        <Button variant="secondary" onClick={() => onRegister(false)} className="w-full">
          Registrar pago
        </Button>
        {canRegisterDeposit && (
          <Button variant="ghost" onClick={() => onRegister(true)} className="w-full">
            Registrar cómo se pagó el anticipo
          </Button>
        )}
      </div>

      {voiding && (
        <VoidPaymentSheet
          payment={voiding}
          appointmentId={a.id}
          onClose={() => setVoiding(null)}
          onVoided={(fresh) => {
            setVoiding(null);
            onChange(fresh);
          }}
        />
      )}
    </div>
  );
}

/** Name of a team member, "ti" for the one looking. */
export function useMemberName(userId: string | null): string | null {
  const { profile } = useAuth();
  const me = !!userId && userId === profile?.user_id;
  const { data } = useQuery({
    queryKey: ["team-member-name", userId],
    queryFn: () => TeamService.displayName(userId ?? ""),
    enabled: !!userId && !me,
    staleTime: Infinity,
  });
  return me ? "ti" : (data ?? null);
}

function PaymentRow({
  payment: p,
  onVoid,
}: {
  payment: AppointmentPayment;
  onVoid: () => void;
}) {
  const { profile } = useAuth();
  const { format: money } = useMoney();
  const canManage = profile?.role === "owner" || profile?.role === "admin";
  const createdBy = useMemberName(p.created_by);
  const voidedBy = useMemberName(p.voided_by);
  const voided = !!p.voided_at;

  const openReceipt = async () => {
    // Opened before the await: browsers block a window opened later
    const win = window.open("", "_blank");
    const url = p.receipt_path ? await AppointmentPaymentsService.receiptUrl(p.receipt_path) : null;
    if (win && url) win.location.href = url;
    else win?.close();
  };

  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span
          className={`font-mono text-body font-semibold tabular-nums ${
            voided ? "text-foreground-subtle line-through" : "text-foreground"
          }`}
        >
          {money(Number(p.amount))}
        </span>
        <span className="text-caption text-foreground-muted">{dateTime(p.paid_at)}</span>
      </div>
      <p className={`text-meta ${voided ? "text-foreground-subtle" : "text-foreground"}`}>
        {p.is_deposit ? "Anticipo · " : ""}
        {paymentMethodText(p.method, p.method_other)}
        {p.reference ? ` · Ref. ${p.reference}` : ""}
      </p>
      {p.notes && <p className="text-caption text-foreground-muted">{p.notes}</p>}
      {createdBy && (
        <p className="text-caption text-foreground-subtle">Registrado por {createdBy}</p>
      )}
      {voided && (
        <p className="text-caption text-danger-600 dark:text-danger-400">
          Anulado el {dateTime(p.voided_at ?? "")}
          {voidedBy ? ` por ${voidedBy}` : ""} · {p.void_reason}
        </p>
      )}
      <div className="mt-1 flex gap-3">
        {p.receipt_path && (
          <button
            type="button"
            onClick={() => void openReceipt()}
            className="cursor-pointer text-meta font-semibold text-primary underline-offset-2 hover:underline"
          >
            Ver comprobante
          </button>
        )}
        {canManage && !voided && (
          <button
            type="button"
            onClick={onVoid}
            className="cursor-pointer text-meta font-semibold text-danger-600 underline-offset-2 hover:underline dark:text-danger-400"
          >
            Anular
          </button>
        )}
      </div>
    </li>
  );
}

function VoidPaymentSheet({
  payment,
  appointmentId,
  onClose,
  onVoided,
}: {
  payment: AppointmentPayment;
  appointmentId: string;
  onClose: () => void;
  onVoided: (fresh: AppointmentWithDetails | null) => void;
}) {
  const toast = useToast();
  const { format: money } = useMoney();
  const voidPayment = useVoidAppointmentPayment();
  const [reason, setReason] = useState("");
  const valid = voidPaymentReasonSchema.safeParse(reason).success;

  return (
    <ConfirmSheet
      open
      onClose={onClose}
      onConfirm={async () => {
        try {
          const fresh = await voidPayment.mutateAsync({
            appointmentId,
            paymentId: payment.id,
            reason: reason.trim(),
          });
          toast.success("Pago anulado");
          onVoided(fresh);
        } catch (err) {
          toast.error("No se pudo anular", err instanceof Error ? err.message : undefined);
        }
      }}
      title="Anular pago"
      confirmLabel="Anular"
      busyLabel="Anulando…"
      busy={voidPayment.isPending}
      confirmDisabled={!valid}
    >
      <p className="text-sm text-foreground-muted">
        El pago de {money(Number(payment.amount))} queda tachado y deja de contar. No se
        borra: se ve quién lo anuló, cuándo y por qué.
        {payment.is_deposit && " El anticipo vuelve a quedar pendiente."}
      </p>
      <textarea
        rows={2}
        maxLength={300}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (por ejemplo, la transferencia no llegó)"
        aria-label="Motivo"
        className={`mt-3 ${inputClasses}`}
      />
    </ConfirmSheet>
  );
}
