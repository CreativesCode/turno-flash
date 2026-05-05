"use client";

import {
  Button,
  Field,
  Sheet,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import type { Service, ServiceFormData } from "@/types/appointments";
import { FormEvent } from "react";

export interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: Service | null;
  formData: ServiceFormData;
  onChange: (patch: Partial<ServiceFormData>) => void;
  onSubmit: (e: FormEvent) => void | Promise<void>;
  isSubmitting: boolean;
}

export function ServiceFormModal({
  open,
  onClose,
  editing,
  formData,
  onChange,
  onSubmit,
  isSubmitting,
}: ServiceFormModalProps) {
  const isEdit = !!editing;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar servicio" : "Nuevo servicio"}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Nombre del servicio">
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={inputClasses}
            placeholder="Corte de pelo"
          />
        </Field>

        <Field label="Descripción (opcional)">
          <textarea
            rows={2}
            value={formData.description ?? ""}
            onChange={(e) => onChange({ description: e.target.value })}
            className={inputClasses}
            placeholder="Detalle visible para el cliente…"
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Duración (min)">
            <input
              type="number"
              required
              min={5}
              step={5}
              value={formData.duration_minutes}
              onChange={(e) =>
                onChange({ duration_minutes: parseInt(e.target.value, 10) })
              }
              className={inputClasses}
            />
          </Field>
          <Field label="Buffer (min)">
            <input
              type="number"
              min={0}
              step={5}
              value={formData.buffer_time_minutes ?? 0}
              onChange={(e) =>
                onChange({ buffer_time_minutes: parseInt(e.target.value, 10) })
              }
              className={inputClasses}
            />
          </Field>
          <Field label="Precio">
            <input
              type="number"
              min={0}
              step={0.01}
              value={formData.price ?? ""}
              onChange={(e) =>
                onChange({
                  price: e.target.value ? parseFloat(e.target.value) : null,
                })
              }
              className={inputClasses}
              placeholder="0"
            />
          </Field>
        </div>

        <Field label="Color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={formData.color ?? "#3b82f6"}
              onChange={(e) => onChange({ color: e.target.value })}
              className="h-10 w-16 cursor-pointer rounded-lg border border-border bg-surface"
            />
            <input
              type="text"
              value={formData.color ?? ""}
              onChange={(e) => onChange({ color: e.target.value })}
              className={inputClasses}
              placeholder="#3B82F6"
            />
          </div>
        </Field>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_active ?? true}
              onChange={(e) => onChange({ is_active: e.target.checked })}
              className="h-4 w-4 rounded border-border text-info focus:ring-info-500"
            />
            <span className="text-sm text-foreground">Servicio activo</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.available_for_online_booking ?? true}
              onChange={(e) =>
                onChange({ available_for_online_booking: e.target.checked })
              }
              className="h-4 w-4 rounded border-border text-info focus:ring-info-500"
            />
            <span className="text-sm text-foreground">
              Disponible para reserva online
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.requires_approval ?? false}
              onChange={(e) => onChange({ requires_approval: e.target.checked })}
              className="h-4 w-4 rounded border-border text-info focus:ring-info-500"
            />
            <span className="text-sm text-foreground">
              Requiere aprobación manual
            </span>
          </label>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 justify-center"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="mesh-primary"
            disabled={isSubmitting}
            className="flex-2 justify-center"
          >
            {isSubmitting
              ? "Guardando…"
              : isEdit
                ? "Guardar cambios"
                : "Crear servicio"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
