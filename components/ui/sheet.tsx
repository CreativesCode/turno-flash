"use client";

import { useBackToClose } from "@/hooks/useBackToClose";
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
  useBackToClose(open, onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // The page behind must not scroll while the sheet is open
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 touch-none bg-black/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-surface shadow-xl sm:max-h-[90dvh] sm:rounded-2xl sm:border sm:border-border ${maxWidthClass}`}
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
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        {/* dvh shrinks with the on-screen keyboard, so the body (and its
            sticky SheetFooter) stays above it */}
        <div className="scrollbar-discreet min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * Action row pinned to the bottom of the Sheet body, so the submit button
 * stays visible on long forms and above the keyboard.
 */
export function SheetFooter({ children }: { children: ReactNode }) {
  return (
    <div className="sticky -bottom-5 -mx-5 -mb-5 flex gap-2 border-t border-border bg-surface px-5 py-3 [&>button]:min-h-11">
      {children}
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
      <label className="block text-xs font-bold uppercase tracking-[0.05em] text-foreground-muted">
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
