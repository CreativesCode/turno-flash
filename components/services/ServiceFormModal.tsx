"use client";

import {
  Button,
  Field,
  Select,
  Sheet,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import {
  SERVICE_BADGE_KEYS,
  SERVICE_BADGES,
  isServiceBadge,
} from "@/config/service-badges";
import { SERVICE_DESCRIPTION_MAX } from "@/schemas/service.schema";
import type {
  Service,
  ServiceCategory,
  ServiceFormData,
} from "@/types/appointments";
import { Copy } from "lucide-react";
import { FormEvent } from "react";

export interface ServiceFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: Service | null;
  formData: ServiceFormData;
  onChange: (patch: Partial<ServiceFormData>) => void;
  onSubmit: (e: FormEvent) => void | Promise<void>;
  isSubmitting: boolean;
  /** The field only shows when the business has categories */
  categories: ServiceCategory[];
  /** Copies the saved service (only while editing) */
  onDuplicate: (service: Service) => void;
}

export function ServiceFormModal({
  open,
  onClose,
  editing,
  formData,
  onChange,
  onSubmit,
  isSubmitting,
  categories,
  onDuplicate,
}: ServiceFormModalProps) {
  const description = formData.description ?? "";
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

        {categories.length > 0 && (
          <Field label="Categoría">
            <Select
              value={formData.category_id ?? ""}
              onChange={(e) => onChange({ category_id: e.target.value || null })}
            >
              <option value="">Sin categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field
          label="Descripción (opcional)"
          hint={`Lo que incluye, una cosa por línea. Se ve igual en tu página de reservas. ${description.length}/${SERVICE_DESCRIPTION_MAX}`}
        >
          <textarea
            rows={4}
            maxLength={SERVICE_DESCRIPTION_MAX}
            value={description}
            onChange={(e) => onChange({ description: e.target.value })}
            className={inputClasses}
            placeholder={"Ej:\n10 fotos 8x10\n4 postales\nAmpliación 12x18"}
          />
        </Field>

        <Field label="Marca (opcional)" hint="Una etiqueta junto al nombre; no cambia el orden">
          <Select
            value={formData.badge ?? ""}
            onChange={(e) =>
              onChange({
                badge: isServiceBadge(e.target.value) ? e.target.value : null,
              })
            }
          >
            <option value="">Sin marca</option>
            {SERVICE_BADGE_KEYS.map((key) => (
              <option key={key} value={key}>
                {SERVICE_BADGES[key].label}
              </option>
            ))}
          </Select>
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

        {editing && (
          <button
            type="button"
            onClick={() => onDuplicate(editing)}
            disabled={isSubmitting}
            className="flex cursor-pointer items-center gap-2 self-start text-meta font-medium text-foreground-muted underline-offset-4 hover:text-foreground hover:underline disabled:opacity-50"
          >
            <Copy className="size-4" />
            Duplicar este servicio (copia lo guardado y quién lo hace)
          </button>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 justify-center"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="primary"
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
