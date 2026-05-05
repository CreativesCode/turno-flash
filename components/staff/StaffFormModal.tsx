"use client";

import {
  Button,
  Field,
  Sheet,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import type { StaffMember, StaffMemberFormData } from "@/types/appointments";
import { FormEvent } from "react";

export interface StaffFormModalProps {
  open: boolean;
  onClose: () => void;
  editing: StaffMember | null;
  formData: StaffMemberFormData;
  onChange: (patch: Partial<StaffMemberFormData>) => void;
  onSpecialtiesChange: (csv: string) => void;
  onSubmit: (e: FormEvent) => void | Promise<void>;
  isSubmitting: boolean;
}

export function StaffFormModal({
  open,
  onClose,
  editing,
  formData,
  onChange,
  onSpecialtiesChange,
  onSubmit,
  isSubmitting,
}: StaffFormModalProps) {
  const isEdit = !!editing;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={isEdit ? "Editar profesional" : "Nuevo profesional"}
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
            />
          </Field>
          <Field label="Apellido">
            <input
              type="text"
              required
              value={formData.last_name}
              onChange={(e) => onChange({ last_name: e.target.value })}
              className={inputClasses}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Apodo (opcional)">
            <input
              type="text"
              value={formData.nickname ?? ""}
              onChange={(e) => onChange({ nickname: e.target.value })}
              className={inputClasses}
              placeholder="Pepe"
            />
          </Field>
          <Field label="Teléfono (opcional)">
            <input
              type="tel"
              value={formData.phone ?? ""}
              onChange={(e) => onChange({ phone: e.target.value })}
              className={inputClasses}
            />
          </Field>
        </div>

        <Field label="Email (opcional)">
          <input
            type="email"
            value={formData.email ?? ""}
            onChange={(e) => onChange({ email: e.target.value })}
            className={inputClasses}
          />
        </Field>

        <Field
          label="Especialidades"
          hint="Separadas por coma — ej: Cortes, Color, Peinados"
        >
          <input
            type="text"
            value={formData.specialties?.join(", ") ?? ""}
            onChange={(e) => onSpecialtiesChange(e.target.value)}
            className={inputClasses}
          />
        </Field>

        <Field label="Bio (opcional)">
          <textarea
            rows={2}
            value={formData.bio ?? ""}
            onChange={(e) => onChange({ bio: e.target.value })}
            className={inputClasses}
          />
        </Field>

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
            <span className="text-sm text-foreground">Profesional activo</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_bookable ?? true}
              onChange={(e) => onChange({ is_bookable: e.target.checked })}
              className="h-4 w-4 rounded border-border text-info focus:ring-info-500"
            />
            <span className="text-sm text-foreground">
              Se pueden reservar turnos con esta persona
            </span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.accepts_online_bookings ?? true}
              onChange={(e) =>
                onChange({ accepts_online_bookings: e.target.checked })
              }
              className="h-4 w-4 rounded border-border text-info focus:ring-info-500"
            />
            <span className="text-sm text-foreground">
              Acepta reservas online
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
                : "Crear profesional"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
