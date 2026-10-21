"use client";

import { ChipButton } from "@/components/appointments/AppointmentModal";
import { Button, ConfirmSheet } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useMoney } from "@/hooks/useMoney";
import { TeamService } from "@/services/team.service";
import type { AppointmentWithDetails } from "@/types/appointments";
import {
  DEPOSIT_STATUS_LABEL,
  depositOpen,
  depositOverdue,
  type DepositAction,
  type DepositStatus,
} from "@/utils/deposit";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export type DepositChoiceValue = "pending" | "verified" | "waived";

/**
 * Creating an appointment for a service with a deposit: by default it waits for
 * the deposit; the owner can say it is already paid or waive it this time.
 */
export function DepositChoice({
  amount,
  value,
  onChange,
}: {
  amount: number;
  value: DepositChoiceValue;
  onChange: (value: DepositChoiceValue) => void;
}) {
  const { profile } = useAuth();
  const { format: money } = useMoney();
  const canManage = profile?.role === "owner" || profile?.role === "admin";

  return (
    <div className="flex flex-col gap-2 rounded-card border border-border bg-surface-2 p-3">
      <p className="text-meta text-foreground">
        Este turno pide un anticipo de <strong>{money(amount)}</strong>.
      </p>
      {canManage ? (
        <div className="flex flex-wrap gap-2">
          <ChipButton
            selected={value === "pending"}
            onClick={() => onChange("pending")}
          >
            Falta cobrarlo
          </ChipButton>
          <ChipButton
            selected={value === "verified"}
            onClick={() => onChange("verified")}
          >
            Ya lo cobré
          </ChipButton>
          <ChipButton
            selected={value === "waived"}
            onClick={() => onChange("waived")}
          >
            Sin anticipo esta vez
          </ChipButton>
        </div>
      ) : null}
      <p className="text-caption text-foreground-muted">
        {value === "pending"
          ? "El turno queda pendiente hasta que se marque el anticipo como recibido."
          : value === "verified"
            ? "El turno queda confirmado con el anticipo recibido."
            : "El turno queda confirmado sin anticipo."}
      </p>
    </div>
  );
}

/**
 * The deposit of an appointment in its detail: how much, where it stands and
 * what to do with it. Receiving it registers its payment (TUR0008): the owner
 * verifies it at once, anyone else leaves it for the owner to verify.
 */
export function DepositPanel({
  appointment: a,
  onAction,
  busy = false,
  hasDepositPayment = false,
  onRegisterDeposit,
}: {
  appointment: AppointmentWithDetails;
  onAction: (action: DepositAction) => void | Promise<void>;
  busy?: boolean;
  /** Someone already registered the payment of this deposit. */
  hasDepositPayment?: boolean;
  /** Opens "Registrar anticipo". */
  onRegisterDeposit?: () => void;
}) {
  const { profile } = useAuth();
  const { format: money } = useMoney();
  const [confirming, setConfirming] = useState<"waive" | "refund" | null>(null);
  const canManage = profile?.role === "owner" || profile?.role === "admin";
  const status = a.deposit_status as DepositStatus | null;
  const verifiedBy = a.deposit_verified_by;
  const byMe = !!verifiedBy && verifiedBy === profile?.user_id;

  const { data: verifierName } = useQuery({
    queryKey: ["team-member-name", verifiedBy],
    queryFn: () => TeamService.displayName(verifiedBy ?? ""),
    enabled: !!verifiedBy && !byMe && canManage,
    staleTime: Infinity,
  });

  if (a.deposit_waived && !a.deposit_amount) {
    return (
      <div className="mt-3 rounded-[18px] border border-border px-3.5 py-3">
        <div className="text-caption text-foreground-subtle">Anticipo</div>
        <p className="mt-[3px] text-body text-foreground">Sin anticipo (perdonado)</p>
      </div>
    );
  }
  if (!a.deposit_amount || !status) return null;

  const cancelled = a.status === "cancelled" || a.status === "no_show";
  const verifiedLine =
    status === "verified" || status === "refunded"
      ? [
          a.deposit_verified_at
            ? `Recibido el ${new Date(a.deposit_verified_at).toLocaleString("es", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}`
            : null,
          byMe ? "lo marcaste tú" : verifierName ? `por ${verifierName}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      : null;

  return (
    <div className="mt-3 rounded-[18px] border border-border px-3.5 py-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="text-caption text-foreground-subtle">Anticipo</div>
        <div className="font-mono text-body font-semibold tabular-nums text-foreground">
          {money(a.deposit_amount)}
        </div>
      </div>
      <p className="mt-[3px] text-body font-medium text-foreground">
        {status === "paid" && hasDepositPayment
          ? "Pago registrado, falta verificarlo"
          : DEPOSIT_STATUS_LABEL[status]}
        {a.deposit_type === "percent" && a.deposit_value != null && (
          <span className="font-normal text-foreground-muted">
            {" "}
            · {Number(a.deposit_value)} % del precio
          </span>
        )}
      </p>
      {a.deposit_due_at && depositOpen(status) && (
        <p
          className={`text-caption ${
            depositOverdue(status, a.deposit_due_at)
              ? "font-semibold text-danger-600 dark:text-danger-400"
              : "text-foreground-muted"
          }`}
        >
          {depositOverdue(status, a.deposit_due_at) ? "Vencido: había que pagarlo antes del " : "Pagar antes del "}
          {new Date(a.deposit_due_at).toLocaleString("es", {
            day: "numeric",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
      {verifiedLine && (
        <p className="text-caption text-foreground-muted">{verifiedLine}</p>
      )}
      {depositOpen(status) && !cancelled && (
        <p className="mt-1 text-caption text-foreground-muted">
          {hasDepositPayment
            ? canManage
              ? "Comprueba que el dinero llegó y verifícalo: el turno queda confirmado."
              : "El pago ya está registrado: falta que el dueño lo verifique."
            : canManage
              ? "El turno se confirma cuando marques el anticipo como recibido."
              : "El turno se confirma cuando el dueño marque el anticipo como recibido."}
        </p>
      )}

      {!canManage && depositOpen(status) && !cancelled && !hasDepositPayment && onRegisterDeposit && (
        <Button onClick={onRegisterDeposit} disabled={busy} className="mt-3 w-full">
          Registrar anticipo
        </Button>
      )}

      {canManage && depositOpen(status) && !cancelled && (
        <div className="mt-3 flex flex-col gap-2">
          <Button
            onClick={() =>
              hasDepositPayment || !onRegisterDeposit
                ? void onAction("verify")
                : onRegisterDeposit()
            }
            disabled={busy}
            className="w-full"
          >
            {hasDepositPayment ? "Verificar anticipo" : "Anticipo recibido"}
          </Button>
          <Button
            variant="secondary"
            onClick={() => setConfirming("waive")}
            disabled={busy}
            className="w-full"
          >
            Perdonar anticipo
          </Button>
        </div>
      )}
      {canManage && status === "verified" && cancelled && (
        <Button
          variant="secondary"
          onClick={() => setConfirming("refund")}
          disabled={busy}
          className="mt-3 w-full"
        >
          Marcar anticipo devuelto
        </Button>
      )}

      <ConfirmSheet
        open={!!confirming}
        onClose={() => setConfirming(null)}
        onConfirm={async () => {
          if (!confirming) return;
          await onAction(confirming);
          setConfirming(null);
        }}
        title={confirming === "refund" ? "Anticipo devuelto" : "Perdonar anticipo"}
        confirmLabel={confirming === "refund" ? "Sí, lo devolví" : "Perdonar"}
        busyLabel="Guardando…"
        busy={busy}
      >
        <p className="text-sm text-foreground-muted">
          {confirming === "refund"
            ? `Marca que le devolviste al cliente los ${money(a.deposit_amount)} del anticipo.`
            : "El turno queda confirmado sin anticipo. No se puede deshacer."}
        </p>
      </ConfirmSheet>
    </div>
  );
}
