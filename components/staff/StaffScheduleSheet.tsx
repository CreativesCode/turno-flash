"use client";

import { Button, Field, Sheet, sheetInputClasses } from "@/components/ui";
import { ExceptionsEditor } from "@/components/staff/ExceptionsEditor";
import { useServicesQuery, useToast } from "@/hooks";
import {
  useSaveStaffSchedule,
  useStaffSchedule,
} from "@/hooks/useStaffSchedule.query";
import {
  staffScheduleSchema,
  type ScheduleRange,
  type StaffScheduleInput,
} from "@/schemas/staff-schedule.schema";
import type { StaffMember } from "@/types/appointments";
import { Plus, X } from "lucide-react";
import { useState } from "react";

/** Monday first for display; values are Postgres DOW (0 = Sunday). */
const DAYS: { dow: number; label: string }[] = [
  { dow: 1, label: "Lunes" },
  { dow: 2, label: "Martes" },
  { dow: 3, label: "Miércoles" },
  { dow: 4, label: "Jueves" },
  { dow: 5, label: "Viernes" },
  { dow: 6, label: "Sábado" },
  { dow: 0, label: "Domingo" },
];

const DEFAULT_RANGE = { start_time: "09:00", end_time: "18:00" };

type DayRange = Omit<ScheduleRange, "day_of_week">;

export interface StaffScheduleSheetProps {
  staff: StaffMember | null;
  onClose: () => void;
}

export function StaffScheduleSheet({ staff, onClose }: StaffScheduleSheetProps) {
  const { data, isLoading, error } = useStaffSchedule(staff?.id ?? null);
  const name = staff ? `${staff.first_name} ${staff.last_name}`.trim() : "";

  return (
    <Sheet
      open={!!staff}
      onClose={onClose}
      title="Horario y servicios"
      subtitle={name}
    >
      {isLoading ? (
        <p className="py-6 text-center text-sm text-foreground-muted">
          Cargando horario...
        </p>
      ) : error || !data || !staff ? (
        <p className="py-6 text-center text-sm text-danger-600">
          {error?.message ?? "No se pudo cargar el horario"}
        </p>
      ) : (
        // Keyed by staff: the editor starts from the loaded data without syncing state in an effect
        <ScheduleEditor
          key={staff.id}
          staff={staff}
          initial={data}
          onDone={onClose}
        />
      )}
    </Sheet>
  );
}

function ScheduleEditor({
  staff,
  initial,
  onDone,
}: {
  staff: StaffMember;
  initial: StaffScheduleInput;
  onDone: () => void;
}) {
  const [draft, setDraft] = useState<StaffScheduleInput>(initial);
  const { services, loading: loadingServices } = useServicesQuery({
    isActive: true,
  });
  const saveMutation = useSaveStaffSchedule();
  const toast = useToast();

  const validation = staffScheduleSchema.safeParse(draft);
  const validationError = validation.success
    ? null
    : (validation.error.issues[0]?.message ?? "Revisa el horario");

  const toggleService = (serviceId: string) =>
    setDraft((prev) => ({
      ...prev,
      service_ids: prev.service_ids.includes(serviceId)
        ? prev.service_ids.filter((id) => id !== serviceId)
        : [...prev.service_ids, serviceId],
    }));

  const setDayRanges = (dow: number, ranges: DayRange[]) =>
    setDraft((prev) => ({
      ...prev,
      ranges: [
        ...prev.ranges.filter((r) => r.day_of_week !== dow),
        ...ranges.map((r) => ({ ...r, day_of_week: dow })),
      ],
    }));

  const handleSave = async () => {
    try {
      await saveMutation.mutateAsync({ staffId: staff.id, schedule: draft });
      toast.success(
        "Servicios y horario guardados",
        "Los cambios ya se reflejan en las reservas online"
      );
      onDone();
    } catch (err) {
      toast.error(
        "Error al guardar",
        err instanceof Error ? err.message : "No se pudieron guardar los cambios"
      );
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Field
        label="Servicios que realiza"
        hint="Solo se ofrecerá online para los servicios marcados."
      >
        {loadingServices ? (
          <p className="text-sm text-foreground-muted">Cargando servicios...</p>
        ) : services.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            Todavía no hay servicios activos.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {services.map((service) => {
              const selected = draft.service_ids.includes(service.id);
              return (
                <button
                  key={service.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleService(service.id)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    selected
                      ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400"
                      : "border-border bg-surface-2 text-foreground-muted hover:border-border-2"
                  }`}
                >
                  <span
                    aria-hidden
                    className="h-2 w-2 rounded-full"
                    style={{ background: service.color ?? "#3b82f6" }}
                  />
                  {service.name}
                </button>
              );
            })}
          </div>
        )}
      </Field>

      <Field
        label="Horario semanal"
        hint="Un profesional sin horario no aparece en la reserva online."
      >
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {DAYS.map(({ dow, label }) => (
            <DayRow
              key={dow}
              label={label}
              ranges={draft.ranges
                .filter((r) => r.day_of_week === dow)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))}
              onChange={(ranges) => setDayRanges(dow, ranges)}
            />
          ))}
        </div>
      </Field>

      {validationError && (
        <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
          {validationError}
        </div>
      )}

      <div className="flex gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onDone}
          disabled={saveMutation.isPending}
          className="flex-1 justify-center"
        >
          Cancelar
        </Button>
        <Button
          type="button"
          variant="mesh-primary"
          onClick={handleSave}
          disabled={saveMutation.isPending || !!validationError}
          className="flex-2 justify-center"
        >
          {saveMutation.isPending ? "Guardando…" : "Guardar servicios y horario"}
        </Button>
      </div>

      <div className="border-t border-border pt-4">
        <Field
          label="Días libres y vacaciones"
          hint="Se guardan al agregarlos. Esos días no se ofrecen en la reserva online."
        >
          <ExceptionsEditor
            organizationId={staff.organization_id}
            staffId={staff.id}
          />
        </Field>
      </div>
    </div>
  );
}

function DayRow({
  label,
  ranges,
  onChange,
}: {
  label: string;
  ranges: DayRange[];
  onChange: (ranges: DayRange[]) => void;
}) {
  const isOpen = ranges.length > 0;

  const updateRange = (index: number, patch: Partial<DayRange>) =>
    onChange(ranges.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  return (
    <div className="flex flex-col gap-2 px-3 py-2.5">
      <label className="flex cursor-pointer items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">{label}</span>
        <span className="flex items-center gap-2 text-xs text-foreground-muted">
          {isOpen ? "Trabaja" : "No trabaja"}
          <input
            type="checkbox"
            checked={isOpen}
            onChange={(e) => onChange(e.target.checked ? [DEFAULT_RANGE] : [])}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary-500"
          />
        </span>
      </label>

      {ranges.map((range, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="time"
            value={range.start_time}
            onChange={(e) => updateRange(index, { start_time: e.target.value })}
            aria-label={`${label} desde`}
            className={sheetInputClasses}
          />
          <span className="text-xs text-foreground-muted">a</span>
          <input
            type="time"
            value={range.end_time}
            onChange={(e) => updateRange(index, { end_time: e.target.value })}
            aria-label={`${label} hasta`}
            className={sheetInputClasses}
          />
          <button
            type="button"
            onClick={() => onChange(ranges.filter((_, i) => i !== index))}
            aria-label="Quitar tramo"
            className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}

      {isOpen && (
        <button
          type="button"
          onClick={() =>
            onChange([...ranges, { start_time: "15:00", end_time: "19:00" }])
          }
          className="inline-flex cursor-pointer items-center gap-1 self-start text-xs font-semibold text-primary-700 hover:underline dark:text-primary-400"
        >
          <Plus className="h-3.5 w-3.5" />
          Agregar tramo
        </button>
      )}
    </div>
  );
}
