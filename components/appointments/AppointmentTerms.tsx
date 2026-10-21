"use client";

import {
  Button,
  Field,
  Select,
  Sheet,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useMoney } from "@/hooks/useMoney";
import type { AppointmentTerms } from "@/services/appointments.service";
import type { AppointmentWithDetails } from "@/types/appointments";
import {
  depositFor,
  fromLocalDateTimeInput,
  toLocalDateTimeInput,
} from "@/utils/deposit";
import { useState } from "react";

/** Conditions of one appointment as the form edits them (inputs are strings). */
export interface TermsDraft {
  /** "" = the service price */
  price: string;
  depositType: "none" | "fixed" | "percent";
  depositValue: string;
  /** `datetime-local` value; "" = no deadline (or the service one) */
  dueAt: string;
  terms: string;
}

const TERMS_MAX = 1000;

/**
 * Price, deposit, deadline and conditions of one appointment (TUR0007). Used
 * when creating it and in its "Precio y condiciones" sheet.
 */
export function TermsFields({
  draft,
  onChange,
  servicePrice,
  depositLocked = false,
  dueHint = "Si lo dejas vacío, no hay fecha límite.",
}: {
  draft: TermsDraft;
  onChange: (patch: Partial<TermsDraft>) => void;
  servicePrice: number | null;
  /** The deposit was already paid: amount and deadline stay as they are. */
  depositLocked?: boolean;
  dueHint?: string;
}) {
  const { format: money } = useMoney();
  const price = draft.price !== "" ? Number(draft.price) : servicePrice;
  const percent = draft.depositType === "percent";
  const amount =
    draft.depositType === "none"
      ? null
      : depositFor(draft.depositType, Number(draft.depositValue) || null, price);

  return (
    <div className="flex flex-col gap-3">
      <Field
        label="Precio del turno"
        hint={
          servicePrice != null
            ? `Vacío = el precio del servicio (${money(servicePrice)}).`
            : "Vacío = el precio del servicio."
        }
      >
        <input
          type="number"
          min={0}
          step={0.01}
          value={draft.price}
          onChange={(e) => onChange({ price: e.target.value })}
          className={inputClasses}
          placeholder={servicePrice != null ? String(servicePrice) : "0"}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Anticipo">
          <Select
            value={draft.depositType}
            disabled={depositLocked}
            onChange={(e) =>
              onChange({
                depositType:
                  e.target.value === "fixed" || e.target.value === "percent"
                    ? e.target.value
                    : "none",
                depositValue: "",
              })
            }
          >
            <option value="none">Sin anticipo</option>
            <option value="percent">Porcentaje del precio</option>
            <option value="fixed">Importe fijo</option>
          </Select>
        </Field>
        {draft.depositType !== "none" && (
          <Field label={percent ? "Porcentaje (%)" : "Importe"}>
            <input
              type="number"
              required
              disabled={depositLocked}
              min={percent ? 1 : 0.01}
              max={percent ? 100 : (price ?? undefined)}
              step={percent ? 1 : 0.01}
              value={draft.depositValue}
              onChange={(e) => onChange({ depositValue: e.target.value })}
              className={inputClasses}
            />
          </Field>
        )}
      </div>

      {draft.depositType !== "none" && (
        <Field label="Pagar el anticipo antes de" hint={dueHint}>
          <input
            type="datetime-local"
            disabled={depositLocked}
            value={draft.dueAt}
            onChange={(e) => onChange({ dueAt: e.target.value })}
            className={inputClasses}
          />
        </Field>
      )}

      {depositLocked ? (
        <p className="text-caption text-foreground-muted">
          El anticipo ya se pagó: su importe y su plazo no se pueden cambiar.
        </p>
      ) : (
        amount != null && (
          <p className="text-caption text-foreground-muted">
            Anticipo: {money(amount)}
          </p>
        )
      )}

      <Field
        label="Condiciones"
        hint={`Qué incluye el precio, cancelación y devolución. ${draft.terms.length}/${TERMS_MAX}`}
      >
        <textarea
          rows={3}
          maxLength={TERMS_MAX}
          value={draft.terms}
          onChange={(e) => onChange({ terms: e.target.value })}
          className={inputClasses}
        />
      </Field>
    </div>
  );
}

/** The current conditions of an appointment, as a draft to edit. */
function draftOf(a: AppointmentWithDetails): TermsDraft {
  // Deposits from before 093 have an amount but no type: treat them as fixed
  const type = a.deposit_type ?? (a.deposit_amount ? "fixed" : null);
  return {
    price: a.price_charged != null ? String(a.price_charged) : "",
    depositType: type === "fixed" || type === "percent" ? type : "none",
    depositValue:
      a.deposit_value != null
        ? String(a.deposit_value)
        : a.deposit_amount != null
          ? String(a.deposit_amount)
          : "",
    dueAt: toLocalDateTimeInput(a.deposit_due_at),
    terms: a.payment_terms ?? "",
  };
}

/** Edits the conditions of an appointment that already exists (owner or admin). */
export function TermsSheet({
  open,
  onClose,
  appointment: a,
  onSave,
  busy = false,
}: {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentWithDetails;
  onSave: (terms: AppointmentTerms) => void | Promise<void>;
  busy?: boolean;
}) {
  const [draft, setDraft] = useState<TermsDraft>(() => draftOf(a));
  // Same rule as set_appointment_terms (093): paid, verified or refunded stays as it is
  const locked = ["paid", "verified", "refunded"].includes(a.deposit_status ?? "");
  const owed = a.deposit_status === "pending" || a.deposit_status === "requested";

  const save = () => {
    const deposit: Pick<AppointmentTerms, "depositType" | "depositValue" | "depositDueAt"> =
      locked
        ? {
            // Unchanged, exactly as stored: the database refuses any difference
            depositType: (a.deposit_type as AppointmentTerms["depositType"]) ?? null,
            depositValue: a.deposit_value ?? null,
            depositDueAt: a.deposit_due_at ?? null,
          }
        : draft.depositType === "none"
          ? { depositType: null, depositValue: null, depositDueAt: null }
          : {
              depositType: draft.depositType,
              depositValue: Number(draft.depositValue) || null,
              depositDueAt: fromLocalDateTimeInput(draft.dueAt),
            };
    void onSave({
      price: draft.price !== "" ? Number(draft.price) : null,
      ...deposit,
      paymentTerms: draft.terms.trim() || null,
    });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Precio y condiciones">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <TermsFields
          draft={draft}
          onChange={(patch) => setDraft((prev) => ({ ...prev, ...patch }))}
          servicePrice={a.service_price}
          depositLocked={locked}
        />
        {owed && draft.depositType === "none" && (
          <p className="text-caption text-warning-700 dark:text-warning-400">
            Sin anticipo, el turno queda confirmado (como «Perdonar anticipo»).
          </p>
        )}
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy} className="flex-1 justify-center">
            Cancelar
          </Button>
          <Button type="submit" disabled={busy} className="flex-2 justify-center">
            {busy ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}

/** The conditions in the appointment detail, and the button to change them. */
export function TermsBlock({
  appointment: a,
  onEdit,
}: {
  appointment: AppointmentWithDetails;
  onEdit?: () => void;
}) {
  const { profile } = useAuth();
  const canManage = profile?.role === "owner" || profile?.role === "admin";
  const editedLine = a.terms_updated_at
    ? `Cambiado el ${new Date(a.terms_updated_at).toLocaleString("es", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })}${a.terms_updated_by === profile?.user_id ? " · por ti" : ""}`
    : null;

  if (!a.payment_terms && !(canManage && onEdit)) return null;

  return (
    <div className="mt-3 rounded-[18px] border border-border px-3.5 py-3">
      <div className="text-caption text-foreground-subtle">Condiciones</div>
      <p className="mt-[3px] whitespace-pre-line text-body text-foreground">
        {a.payment_terms || "Sin condiciones escritas."}
      </p>
      {editedLine && (
        <p className="mt-1 text-caption text-foreground-muted">{editedLine}</p>
      )}
      {canManage && onEdit && (
        <Button variant="secondary" onClick={onEdit} className="mt-3 w-full">
          Precio y condiciones
        </Button>
      )}
    </div>
  );
}
