"use client";

import { Card, ConfirmSheet } from "@/components/ui";
import { useToast } from "@/hooks";
import { Logger } from "@/utils/logger";
import { createClient } from "@/utils/supabase/client";
import { Blocks, Bus, Calendar } from "lucide-react";
import { useState } from "react";

export interface ModulesCardProps {
  organizationId: string;
  appointments: boolean;
  trips: boolean;
  /** Only a platform admin can change them (trigger of migration 033). */
  canEdit: boolean;
  onChanged: () => void;
}

/**
 * Which product this business uses. Chosen at signup and changed only here:
 * the database enforces it with a trigger, this card is just the way in.
 */
export function ModulesCard({
  organizationId,
  appointments,
  trips,
  canEdit,
  onChanged,
}: ModulesCardProps) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  /** A module about to be turned off, waiting for confirmation. */
  const [pendingOff, setPendingOff] = useState<{
    appointments: boolean;
    trips: boolean;
  } | null>(null);

  const save = async (next: { appointments: boolean; trips: boolean }) => {
    // The business has to keep at least one: the database rejects the rest,
    // but saying it here is friendlier than a constraint error.
    if (!next.appointments && !next.trips) {
      toast.error("Un negocio necesita al menos un módulo");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("organizations")
        .update({
          appointments_module_enabled: next.appointments,
          trips_module_enabled: next.trips,
        })
        .eq("id", organizationId);
      if (error) throw error;
      toast.success("Módulos actualizados");
      onChanged();
    } catch (error) {
      void Logger.error("Error updating organization modules", error, {
        organizationId,
      });
      toast.error("Error", "No se pudieron cambiar los módulos");
    } finally {
      setSaving(false);
    }
  };

  const change = (next: { appointments: boolean; trips: boolean }) => {
    const turnsOff =
      (appointments && !next.appointments) || (trips && !next.trips);
    // Leaving the business with no module is rejected by save() itself
    if (turnsOff && (next.appointments || next.trips)) setPendingOff(next);
    else void save(next);
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-foreground-muted">
          <Blocks className="h-4.5 w-4.5" />
        </div>
        <div>
          <div className="text-sm font-bold text-foreground">
            Módulos del negocio
          </div>
          <p className="mt-0.5 text-xs leading-relaxed text-foreground-muted">
            {canEdit
              ? "Definen qué ve este negocio en la app. Apagar uno oculta sus pantallas, no borra nada."
              : "Definen qué ves en la app. Para cambiarlos, escríbele al soporte de TurnoFlash."}
          </p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <ModuleToggle
          icon={Calendar}
          label="Turnos y citas"
          checked={appointments}
          disabled={!canEdit || saving}
          onChange={(value) => change({ appointments: value, trips })}
        />
        <ModuleToggle
          icon={Bus}
          label="Reserva de asientos"
          checked={trips}
          disabled={!canEdit || saving}
          onChange={(value) => change({ appointments, trips: value })}
        />
      </div>

      <ConfirmSheet
        open={pendingOff !== null}
        onClose={() => setPendingOff(null)}
        onConfirm={async () => {
          if (pendingOff) await save(pendingOff);
          setPendingOff(null);
        }}
        title="Apagar módulo"
        confirmLabel="Apagar"
        busyLabel="Guardando…"
        busy={saving}
      >
        <p>
          El negocio deja de ver las pantallas de{" "}
          {pendingOff && !pendingOff.appointments
            ? "Turnos y citas"
            : "Reserva de asientos"}{" "}
          y su página pública deja de recibir reservas. No se borra nada: al
          volver a encenderlo, todo sigue ahí.
        </p>
      </ConfirmSheet>
    </Card>
  );
}

function ModuleToggle({
  icon: Icon,
  label,
  checked,
  disabled,
  onChange,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label
      className={`flex items-center gap-2.5 rounded-lg border p-3 text-sm ${
        checked
          ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
          : "border-border bg-surface"
      } ${disabled ? "opacity-60" : "cursor-pointer"}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 shrink-0 accent-primary-500"
      />
      <Icon className="h-4 w-4 shrink-0 text-foreground-muted" />
      <span className="font-semibold text-foreground">{label}</span>
    </label>
  );
}
