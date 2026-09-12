"use client";

import {
  Button,
  Field,
  Sheet,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import { ORGANIZATION_TIMEZONES } from "@/config/constants";
import { getGracePeriodDays } from "@/utils/license";
import { FormEvent } from "react";

export interface OrganizationEditForm {
  name: string;
  slug: string;
  timezone: string;
  whatsapp_phone: string;
  is_active: boolean;
  /** `datetime-local` input value, empty when unset. */
  license_start_date: string;
  /** `datetime-local` input value, empty when unset. */
  license_end_date: string;
}

export interface OrganizationEditSheetProps {
  open: boolean;
  onClose: () => void;
  formData: OrganizationEditForm;
  onChange: (patch: Partial<OrganizationEditForm>) => void;
  onSubmit: (e: FormEvent) => void | Promise<void>;
  isSubmitting: boolean;
}

export function OrganizationEditSheet({
  open,
  onClose,
  formData,
  onChange,
  onSubmit,
  isSubmitting,
}: OrganizationEditSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} title="Editar organización">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field label="Nombre">
          <input
            type="text"
            required
            value={formData.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className={inputClasses}
          />
        </Field>

        <Field
          label="Slug (link de reservas)"
          hint="Solo letras minúsculas, números y guiones. Debe ser único. Cambiarlo invalida el link ya compartido."
        >
          <div className="flex items-center gap-2">
            <span className="shrink-0 text-sm text-foreground-muted">
              /book?b=
            </span>
            <input
              type="text"
              required
              pattern="[a-z0-9-]+"
              value={formData.slug}
              onChange={(e) => onChange({ slug: e.target.value.toLowerCase() })}
              className={inputClasses}
            />
          </div>
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Zona horaria">
            <select
              value={formData.timezone}
              onChange={(e) => onChange({ timezone: e.target.value })}
              className={inputClasses}
            >
              {ORGANIZATION_TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz}
                </option>
              ))}
            </select>
          </Field>
          <Field label="WhatsApp">
            <input
              type="tel"
              value={formData.whatsapp_phone}
              onChange={(e) => onChange({ whatsapp_phone: e.target.value })}
              className={inputClasses}
              placeholder="+5491123456789"
            />
          </Field>
        </div>

        <div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Inicio licencia">
              <input
                type="datetime-local"
                value={formData.license_start_date}
                onChange={(e) =>
                  onChange({ license_start_date: e.target.value })
                }
                className={inputClasses}
              />
            </Field>
            <Field label="Fin licencia">
              <input
                type="datetime-local"
                value={formData.license_end_date}
                onChange={(e) => onChange({ license_end_date: e.target.value })}
                className={inputClasses}
              />
            </Field>
          </div>
          <p className="mt-1 text-[11px] text-foreground-subtle">
            Deja las fechas vacías para acceso ilimitado. Al vencer tiene{" "}
            {getGracePeriodDays()} días de gracia.
          </p>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={formData.is_active}
            onChange={(e) => onChange({ is_active: e.target.checked })}
            className="h-4 w-4 rounded border-border text-info focus:ring-info-500"
          />
          <span className="text-sm text-foreground">Organización activa</span>
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
            {isSubmitting ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
