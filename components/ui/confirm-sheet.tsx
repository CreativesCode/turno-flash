"use client";

import { ReactNode } from "react";
import { Button } from "./button";
import { Sheet } from "./sheet";

export interface ConfirmSheetProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  /** Body copy explaining what will happen. */
  children: ReactNode;
  confirmLabel?: string;
  busyLabel?: string;
  /** While true, both buttons are disabled and the sheet can't be dismissed. */
  busy?: boolean;
}

/** Destructive-action confirmation, rendered as a Sheet (bottom-sheet on mobile). */
export function ConfirmSheet({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = "Eliminar",
  busyLabel = "Eliminando…",
  busy = false,
}: ConfirmSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      maxWidthClass="sm:max-w-md"
    >
      <div className="flex flex-col gap-4">
        <div className="text-sm text-foreground-muted">{children}</div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={busy}
            className="flex-1 justify-center"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 justify-center"
          >
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
