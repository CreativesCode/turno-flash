"use client";

import { ConfirmSheet, sheetInputClasses as inputClasses } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { TeamService } from "@/services/team.service";
import type { AppointmentWithDetails } from "@/types/appointments";
import {
  CANCELLATION_CATEGORIES,
  CANCELLATION_LABELS,
  cancellationLabel,
  type CancellationCategory,
} from "@/utils/cancellation";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

/** "Motivo: El cliente canceló · por Ana · 23 oct 10:40" on a cancelled appointment. */
export function CancellationNote({ appointment: a }: { appointment: AppointmentWithDetails }) {
  const { profile } = useAuth();
  const by = a.cancelled_by;
  const byMe = !!by && by === profile?.user_id;
  const { data: byName } = useQuery({
    queryKey: ["team-member-name", by],
    queryFn: () => TeamService.displayName(by ?? ""),
    enabled: !!by && !byMe,
    staleTime: Infinity,
  });
  const reason = cancellationLabel(a.cancellation_category, a.cancellation_reason);
  if (a.status !== "cancelled" || !reason) return null;

  const when = a.cancelled_at
    ? new Date(a.cancelled_at).toLocaleString("es", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  const who = byMe ? "ti" : byName;
  return (
    <p className="mt-2 text-meta text-foreground-muted">
      <span className="font-semibold text-foreground">Motivo:</span> {reason}
      {who ? ` · por ${who}` : ""}
      {when ? ` · ${when}` : ""}
    </p>
  );
}

/** "Cancelar turno" with the reason it is cancelled (TUR0010); "Otro" needs the text. */
export function CancelAppointmentSheet({
  open,
  onClose,
  onConfirm,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (category: CancellationCategory, reason: string | undefined) => Promise<void>;
  busy: boolean;
}) {
  const [category, setCategory] = useState<CancellationCategory | null>(null);
  const [other, setOther] = useState("");
  const valid = category !== null && (category !== "other" || other.trim() !== "");

  const close = () => {
    setCategory(null);
    setOther("");
    onClose();
  };

  return (
    <ConfirmSheet
      open={open}
      onClose={close}
      onConfirm={async () => {
        if (!valid || !category) return;
        await onConfirm(category, category === "other" ? other.trim() : undefined);
        setCategory(null);
        setOther("");
      }}
      title="Cancelar turno"
      confirmLabel="Cancelar turno"
      busyLabel="Guardando…"
      busy={busy}
      confirmDisabled={!valid}
    >
      <p className="text-sm text-foreground-muted">
        El horario queda libre y, si tienes WhatsApp conectado, le avisamos al cliente. No se puede
        deshacer.
      </p>
      <fieldset className="mt-4 flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold text-foreground">¿Por qué se cancela?</legend>
        {CANCELLATION_CATEGORIES.map((value) => (
          <label
            key={value}
            className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-border px-3 text-sm text-foreground has-[:checked]:border-primary has-[:checked]:bg-primary-50 dark:has-[:checked]:bg-primary-950"
          >
            <input
              type="radio"
              name="cancellation-category"
              value={value}
              checked={category === value}
              onChange={() => setCategory(value)}
              className="accent-primary"
            />
            {CANCELLATION_LABELS[value]}
          </label>
        ))}
      </fieldset>
      {category === "other" && (
        <textarea
          rows={2}
          maxLength={200}
          value={other}
          onChange={(e) => setOther(e.target.value)}
          placeholder="Escribe el motivo"
          aria-label="Motivo"
          className={`mt-3 ${inputClasses}`}
        />
      )}
    </ConfirmSheet>
  );
}
