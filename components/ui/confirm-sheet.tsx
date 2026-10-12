"use client";

import { ReactNode } from "react";
import { Button } from "./button";
import { Sheet, SheetFooter } from "./sheet";

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
  /** Red for destructive actions (default); primary for constructive ones. */
  confirmVariant?: "danger" | "primary";
  /** Keeps the confirm button off until the sheet's input is valid. */
  confirmDisabled?: boolean;
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
  confirmVariant = "danger",
  confirmDisabled = false,
}: ConfirmSheetProps) {
  return (
    <Sheet
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      maxWidthClass="sm:max-w-md"
    >
      <div className="flex flex-col gap-5">
        <div className="text-body text-foreground-muted">{children}</div>
        <SheetFooter>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={busy}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            variant={confirmVariant === "danger" ? "danger-solid" : "primary"}
            onClick={onConfirm}
            disabled={busy || confirmDisabled}
            className="flex-1"
          >
            {busy ? busyLabel : confirmLabel}
          </Button>
        </SheetFooter>
      </div>
    </Sheet>
  );
}
