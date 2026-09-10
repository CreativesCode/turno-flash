"use client";

import {
  Button,
  Field,
  Sheet,
  sheetInputClasses as inputClasses,
} from "@/components/ui";
import { FormEvent } from "react";

export interface InviteUserSheetProps {
  open: boolean;
  onClose: () => void;
  email: string;
  onEmailChange: (email: string) => void;
  onSubmit: (e: FormEvent) => void | Promise<void>;
  isSubmitting: boolean;
  error: string | null;
  success: string | null;
}

export function InviteUserSheet({
  open,
  onClose,
  email,
  onEmailChange,
  onSubmit,
  isSubmitting,
  error,
  success,
}: InviteUserSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Invitar usuario"
      subtitle="Recibirá un correo con un enlace para configurar su contraseña."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <Field
          label="Correo electrónico"
          hint="Para que sea dueño de un negocio, invítalo primero y luego créale la organización."
        >
          <input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className={inputClasses}
            placeholder="usuario@ejemplo.com"
          />
        </Field>

        {error && (
          <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger-800 dark:bg-danger-900/20 dark:text-danger-400">
            {error}
          </div>
        )}
        {success && (
          <div className="rounded-lg bg-success-50 p-3 text-sm text-success-800 dark:bg-success-900/20 dark:text-success-400">
            {success}
          </div>
        )}

        <div className="flex gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 justify-center"
          >
            Cerrar
          </Button>
          <Button
            type="submit"
            variant="mesh-primary"
            disabled={isSubmitting}
            className="flex-2 justify-center"
          >
            {isSubmitting ? "Enviando…" : "Enviar invitación"}
          </Button>
        </div>
      </form>
    </Sheet>
  );
}
