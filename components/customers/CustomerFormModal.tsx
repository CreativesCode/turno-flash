"use client";

import {
  Button,
  Field,
  Sheet,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import type { Customer, CustomerFormData } from "@/types/appointments";
import { FormEvent } from "react";

export interface CustomerFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Null = create mode; non-null = edit mode (header label + button label change). */
  editing: Customer | null;
  formData: CustomerFormData;
  onChange: (patch: Partial<CustomerFormData>) => void;
  onSubmit: (e: FormEvent) => void | Promise<void>;
  isSubmitting: boolean;
}

export function CustomerFormModal({
  open,
  onClose,
  editing,
  formData,
  onChange,
  onSubmit,
  isSubmitting,
}: CustomerFormModalProps) {
  const isEdit = !!editing;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar cliente" : "Nuevo cliente"}
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nombre">
            <input
              type="text"
              required
              value={formData.first_name}
              onChange={(e) => onChange({ first_name: e.target.value })}
              className={inputClasses}
              placeholder="Juana"
            />
          </Field>
          <Field label="Apellido">
            <input
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => onChange({ last_name: e.target.value })}
              className={inputClasses}
              placeholder="Pérez"
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Teléfono">
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              className={inputClasses}
              placeholder="+54 11 1234-5678"
            />
          </Field>
          <Field label="WhatsApp (opcional)">
            <input
              type="tel"
              value={formData.whatsapp_number ?? ""}
              onChange={(e) => onChange({ whatsapp_number: e.target.value })}
              className={inputClasses}
              placeholder="+54 9 11 1234-5678"
            />
          </Field>
        </div>

        <Field label="Email (opcional)">
          <input
            type="email"
            value={formData.email ?? ""}
            onChange={(e) => onChange({ email: e.target.value })}
            className={inputClasses}
            placeholder="cliente@ejemplo.com"
          />
        </Field>

        <Field label="Notas (opcional)">
          <textarea
            rows={2}
            value={formData.notes ?? ""}
            onChange={(e) => onChange({ notes: e.target.value })}
            className={inputClasses}
            placeholder="Preferencias, alergias, recordatorios…"
          />
        </Field>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_active ?? true}
            onChange={(e) => onChange({ is_active: e.target.checked })}
            className="h-4 w-4 rounded border-border text-info focus:ring-info-500"
          />
          <span className="text-sm text-foreground">Cliente activo</span>
        </label>

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
                : "Crear cliente"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
