"use client";

import { X } from "lucide-react";
import { ReactNode, useEffect } from "react";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Title shown on the header. */
  title: string;
  /** Optional subtitle right under the title. */
  subtitle?: string;
  /** Sheet body — usually a form or detail view. */
  children: ReactNode;
  /** Tailwind max-w utility for desktop modal width. Defaults to `sm:max-w-lg`. */
  maxWidthClass?: string;
}

/**
 * Bottom-sheet on mobile (drag handle + radius-tl/tr + max-h 85vh) and
 * centered modal on desktop. Handles overlay-click + Escape to close.
 *
 * Used by the appointments modals and the entity form modals
 * (Customers / Services / Staff). Per the rediseño, every long-form action
 * surfaces as a sheet rather than a centered dialog on mobile.
 */
export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = "sm:max-w-lg",
}: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative max-h-[85vh] w-full overflow-hidden rounded-t-3xl bg-surface shadow-xl sm:max-h-[90vh] sm:rounded-2xl sm:border sm:border-border ${maxWidthClass}`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center py-2 sm:hidden">
          <span
            aria-hidden
            className="block h-1 w-10 rounded-full bg-border-2"
          />
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pb-2 pt-1 sm:pt-5">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-extrabold tracking-tight text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-xs text-foreground-muted">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="scrollbar-discreet max-h-[calc(85vh-3.5rem)] overflow-y-auto px-5 pb-5 sm:max-h-[calc(90vh-4.5rem)]">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Field — uppercase label + content wrapper used inside Sheet forms.
 * Matches the design's `Field` from the prototype.
 */
export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-bold uppercase tracking-[0.05em] text-foreground-muted">
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint && (
        <p className="mt-1 text-[11px] text-foreground-subtle">{hint}</p>
      )}
    </div>
  );
}

/** Tailwind class string shared by inputs/selects/textareas inside a Sheet. */
export const sheetInputClasses =
  "block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-xs transition-colors focus:border-info-500 focus:outline-none focus:ring-1 focus:ring-info-500";
