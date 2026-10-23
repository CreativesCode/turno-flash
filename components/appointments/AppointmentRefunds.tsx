"use client";

import { useMemberName } from "@/components/appointments/AppointmentPayments";
import { ProcessRefundSheet, RegisterRefundSheet } from "@/components/appointments/RefundSheet";
import { Button, ConfirmSheet, sheetInputClasses as inputClasses } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks";
import { useMoney } from "@/hooks/useMoney";
import {
  useAppointmentRefunds,
  useDecideAppointmentRefund,
} from "@/hooks/useAppointmentRefunds.query";
import { useBusinessSettings } from "@/hooks/useBusinessSettings.query";
import { rejectRefundReasonSchema } from "@/schemas/appointment-refund.schema";
import type {
  AppointmentRefund,
  AppointmentRefundEvent,
} from "@/services/appointment-refunds.service";
import type { AppointmentWithDetails } from "@/types/appointments";
import { REFUND_STATUS_LABEL, paymentMethodText } from "@/utils/payment";
import { useState } from "react";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("es", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

const STATUS_CLASS: Record<AppointmentRefund["status"], string> = {
  pending: "text-warning-700 dark:text-warning-400",
  processed: "text-success-700 dark:text-success-400",
  rejected: "text-danger-600 dark:text-danger-400",
};

/**
 * Refunds of a cancelled or no-show appointment (TUR0010): what was refunded,
 * what waits for the owner, each refund with its history, and the sheets to
 * register, process or reject one.
 */
export function AppointmentRefunds({
  appointment: a,
  onChange,
}: {
  appointment: AppointmentWithDetails;
  onChange: (fresh: AppointmentWithDetails | null) => void;
}) {
  const { format: money } = useMoney();
  const { data: settings } = useBusinessSettings();
  const closed = a.status === "cancelled" || a.status === "no_show";
  const paid = Number(a.amount_paid ?? 0);
  const refunded = Number(a.amount_refunded ?? 0);
  const pending = Number(a.amount_refund_pending ?? 0);
  const { data: refunds = [] } = useAppointmentRefunds(a.id, closed && (paid > 0 || refunded + pending > 0));
  const [registering, setRegistering] = useState(false);
  const available = Math.max(paid - refunded - pending, 0);
  const canRegister = (settings?.refunds_enabled ?? true) && available > 0;

  if (!closed || (paid <= 0 && !refunds.length)) return null;
  if (!refunds.length && !canRegister) return null;

  return (
    <div className="mt-3 rounded-[18px] border border-border px-3.5 py-3">
      <div className="text-caption text-foreground-subtle">Devoluciones</div>
      <p className="mt-[3px] text-body text-foreground">
        Devuelto <strong className="font-mono tabular-nums">{money(refunded)}</strong>
        <span className="text-foreground-muted"> de {money(paid)} pagado</span>
      </p>
      {pending > 0 && (
        <p className="text-caption text-warning-700 dark:text-warning-400">
          Devolución pendiente: {money(pending)}
        </p>
      )}

      {refunds.length > 0 && (
        <ul className="mt-3 flex flex-col divide-y divide-border border-t border-border">
          {refunds.map((r) => (
            <RefundRow key={r.id} appointmentId={a.id} refund={r} onChange={onChange} />
          ))}
        </ul>
      )}

      {canRegister && (
        <Button variant="secondary" onClick={() => setRegistering(true)} className="mt-3 w-full">
          Registrar devolución
        </Button>
      )}

      {registering && (
        <RegisterRefundSheet
          appointment={a}
          available={available}
          onClose={() => setRegistering(false)}
          onSaved={(fresh) => {
            setRegistering(false);
            onChange(fresh);
          }}
        />
      )}
    </div>
  );
}

function RefundRow({
  appointmentId,
  refund: r,
  onChange,
}: {
  appointmentId: string;
  refund: AppointmentRefund;
  onChange: (fresh: AppointmentWithDetails | null) => void;
}) {
  const { profile } = useAuth();
  const { format: money } = useMoney();
  const canManage = profile?.role === "owner" || profile?.role === "admin";
  const [deciding, setDeciding] = useState<"processed" | "rejected" | null>(null);
  const done = (fresh: AppointmentWithDetails | null) => {
    setDeciding(null);
    onChange(fresh);
  };

  return (
    <li className="py-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-mono text-body font-semibold tabular-nums text-foreground">
          {money(Number(r.amount))}
        </span>
        <span className={`text-meta font-semibold ${STATUS_CLASS[r.status]}`}>
          {REFUND_STATUS_LABEL[r.status]}
        </span>
      </div>
      <p className="text-meta text-foreground">
        {r.reason}
        {r.status === "processed" && r.method
          ? ` · ${paymentMethodText(r.method, r.method_other)}`
          : ""}
        {r.status === "processed" && r.refunded_at ? ` · ${dateTime(r.refunded_at)}` : ""}
      </p>
      {r.status === "rejected" && r.rejection_reason && (
        <p className="text-caption text-danger-600 dark:text-danger-400">
          No procede: {r.rejection_reason}
        </p>
      )}
      <ol className="mt-1 flex flex-col gap-0.5">
        {r.events.map((e) => (
          <EventLine key={e.id} event={e} />
        ))}
      </ol>
      {canManage && r.status === "pending" && (
        <div className="mt-1 flex gap-3">
          <button
            type="button"
            onClick={() => setDeciding("processed")}
            className="cursor-pointer text-meta font-semibold text-primary underline-offset-2 hover:underline"
          >
            Marcar devuelta
          </button>
          <button
            type="button"
            onClick={() => setDeciding("rejected")}
            className="cursor-pointer text-meta font-semibold text-danger-600 underline-offset-2 hover:underline dark:text-danger-400"
          >
            Rechazar
          </button>
        </div>
      )}

      {deciding === "processed" && (
        <ProcessRefundSheet
          appointmentId={appointmentId}
          refund={r}
          onClose={() => setDeciding(null)}
          onSaved={done}
        />
      )}
      {deciding === "rejected" && (
        <RejectRefundSheet
          appointmentId={appointmentId}
          refund={r}
          onClose={() => setDeciding(null)}
          onRejected={done}
        />
      )}
    </li>
  );
}

const EVENT_TEXT: Record<AppointmentRefundEvent["status"], string> = {
  pending: "Registrada",
  processed: "Devuelta",
  rejected: "Rechazada",
};

function EventLine({ event: e }: { event: AppointmentRefundEvent }) {
  const by = useMemberName(e.changed_by);
  return (
    <li className="text-caption text-foreground-subtle">
      {EVENT_TEXT[e.status]}
      {by ? ` por ${by}` : ""} · {dateTime(e.changed_at)}
    </li>
  );
}

function RejectRefundSheet({
  appointmentId,
  refund,
  onClose,
  onRejected,
}: {
  appointmentId: string;
  refund: AppointmentRefund;
  onClose: () => void;
  onRejected: (fresh: AppointmentWithDetails | null) => void;
}) {
  const toast = useToast();
  const { format: money } = useMoney();
  const decide = useDecideAppointmentRefund();
  const [reason, setReason] = useState("");
  const valid = rejectRefundReasonSchema.safeParse(reason).success;

  return (
    <ConfirmSheet
      open
      onClose={onClose}
      onConfirm={async () => {
        try {
          const fresh = await decide.mutateAsync({
            appointmentId,
            refundId: refund.id,
            decision: { status: "rejected", reason: reason.trim() },
          });
          toast.success("Devolución rechazada");
          onRejected(fresh);
        } catch (err) {
          toast.error("No se pudo rechazar", err instanceof Error ? err.message : undefined);
        }
      }}
      title="Rechazar devolución"
      confirmLabel="Rechazar"
      busyLabel="Guardando…"
      busy={decide.isPending}
      confirmDisabled={!valid}
    >
      <p className="text-sm text-foreground-muted">
        La devolución de {money(Number(refund.amount))} queda rechazada y no se puede deshacer. Si
        tienes WhatsApp conectado, el cliente recibe el motivo.
      </p>
      <textarea
        rows={2}
        maxLength={300}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Motivo (por ejemplo, canceló con menos de 24 h)"
        aria-label="Motivo"
        className={`mt-3 ${inputClasses}`}
      />
    </ConfirmSheet>
  );
}
