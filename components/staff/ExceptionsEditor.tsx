"use client";

import { Button, sheetInputClasses } from "@/components/ui";
import { useToast } from "@/hooks";
import { useOrganizationBasics } from "@/hooks/useBookingSetup.query";
import {
  useCreateStaffException,
  useDeleteStaffException,
  useStaffExceptions,
} from "@/hooks/useStaffExceptions.query";
import { staffExceptionSchema } from "@/schemas/staff-exception.schema";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { Plus, X } from "lucide-react";
import { useState } from "react";

/** "12 sep" or "12 sep – 15 sep 2026" in the business timezone (end is exclusive). */
function formatRange(startIso: string, endIso: string, timezone: string): string {
  const lastMoment = new Date(new Date(endIso).getTime() - 1);
  const from = formatInTimeZone(new Date(startIso), timezone, "d MMM yyyy", { locale: es });
  const to = formatInTimeZone(lastMoment, timezone, "d MMM yyyy", { locale: es });
  return from === to ? from : `${from} – ${to}`;
}

export interface ExceptionsEditorProps {
  organizationId: string;
  /** null = closures of the whole business (holidays) */
  staffId: string | null;
}

/**
 * Lists and adds full days off. Changes are saved immediately (independent of
 * the weekly schedule form) and the booking page stops offering those days.
 */
export function ExceptionsEditor({ organizationId, staffId }: ExceptionsEditorProps) {
  const { data: basics } = useOrganizationBasics(organizationId);
  const { data: exceptions = [], isLoading } = useStaffExceptions(organizationId, staffId);
  const createMutation = useCreateStaffException();
  const deleteMutation = useDeleteStaffException();
  const toast = useToast();

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [title, setTitle] = useState("");

  const timezone = basics?.timezone ?? "UTC";

  const handleAdd = async () => {
    const parsed = staffExceptionSchema.safeParse({
      from,
      to: to || from,
      title: title || undefined,
    });
    if (!parsed.success) {
      toast.error("Revisa las fechas", parsed.error.issues[0]?.message);
      return;
    }
    try {
      await createMutation.mutateAsync({
        organizationId,
        staffId,
        timezone,
        input: parsed.data,
      });
      setFrom("");
      setTo("");
      setTitle("");
      toast.success("Guardado", "Esos días ya no se ofrecen en la reserva online");
    } catch (err) {
      toast.error("Error al guardar", err instanceof Error ? err.message : undefined);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync(id);
    } catch (err) {
      toast.error("Error al eliminar", err instanceof Error ? err.message : undefined);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {isLoading ? (
        <p className="text-sm text-foreground-muted">Cargando...</p>
      ) : exceptions.length === 0 ? (
        <p className="text-xs text-foreground-subtle">
          {staffId ? "No hay días libres cargados." : "No hay cierres cargados."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {exceptions.map((exception) => (
            <li
              key={exception.id}
              className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">
                  {formatRange(exception.start_datetime, exception.end_datetime, timezone)}
                </div>
                <div className="truncate text-[11px] text-foreground-muted">
                  {exception.title}
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(exception.id)}
                disabled={deleteMutation.isPending}
                aria-label="Eliminar"
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-foreground-muted">
          Desde
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={sheetInputClasses}
          />
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-semibold text-foreground-muted">
          Hasta (opcional)
          <input
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
            className={sheetInputClasses}
          />
        </label>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={title}
          maxLength={80}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={staffId ? "Motivo (ej. Vacaciones)" : "Motivo (ej. Feriado)"}
          className={sheetInputClasses}
        />
        <Button
          type="button"
          variant="soft"
          onClick={handleAdd}
          disabled={!from || createMutation.isPending}
          className="shrink-0"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>
    </div>
  );
}
