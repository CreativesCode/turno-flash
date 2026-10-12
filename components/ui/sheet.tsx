"use client";

import { useBackToClose } from "@/hooks/useBackToClose";
import { X } from "lucide-react";
import {
  Children,
  cloneElement,
  isValidElement,
  ReactNode,
  useEffect,
  useId,
} from "react";

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  /** Title shown on the header. */
  title: string;
  /** Keeps the title only as the dialog's accessible name: no header row. */
  hideTitle?: boolean;
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
  hideTitle = false,
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
        className="absolute inset-0 touch-none bg-overlay"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-sheet bg-surface sm:max-h-[90dvh] sm:rounded-card sm:border sm:border-border ${maxWidthClass}`}
        style={{ paddingBottom: "var(--safe-area-inset-bottom, 0px)" }}
      >
        {/* Drag handle (mobile only) */}
        <div className="flex justify-center pb-3 pt-2.5 sm:hidden">
          <span
            aria-hidden
            className="block h-[5px] w-10 rounded-full bg-border-2"
          />
        </div>

        {/* Header */}
        <div
          className={
            hideTitle
              ? "hidden"
              : "flex items-start justify-between gap-3 px-5 pb-2 pt-1 sm:pt-5"
          }
        >
          <div className="min-w-0 flex-1">
            <h2 className="text-title font-semibold tracking-[-0.01em] text-foreground">
              {title}
            </h2>
            {subtitle && (
              <p className="mt-0.5 text-meta text-foreground-muted">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-control bg-surface-2 text-foreground-muted transition-colors hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="size-[18px]" />
          </button>
        </div>

        {/* Body */}
        {/* dvh shrinks with the on-screen keyboard, so the body (and its
            sticky SheetFooter) stays above it */}
        <div
          className={`scrollbar-discreet min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 ${
            hideTitle ? "sm:pt-5" : ""
          }`}
        >
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
    <div className="sticky -bottom-5 -mx-5 -mb-5 flex gap-2 border-t border-border bg-surface px-5 py-3 [&>button]:h-[54px] [&>button]:rounded-[14px] [&>button]:text-[16px]">
      {children}
    </div>
  );
}

/**
 * Field — label + content wrapper used inside Sheet forms.
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
  // Ties the label to its control, so tapping the label focuses the input
  // (the first element inside: an error line may follow the input)
  const generatedId = useId();
  const items = Children.toArray(children);
  const controlIndex = items.findIndex((item) => isValidElement(item));
  const control = items[controlIndex];
  const controlId = isValidElement<{ id?: string }>(control)
    ? control.props.id ?? generatedId
    : undefined;

  return (
    <div>
      <label
        htmlFor={controlId}
        className="block text-meta font-medium text-foreground-muted"
      >
        {label}
      </label>
      <div className="mt-1.5">
        {items.map((item, index) =>
          index === controlIndex && isValidElement<{ id?: string }>(item)
            ? cloneElement(item, { id: controlId })
            : item
        )}
      </div>
      {hint && (
        <p className="mt-1 text-caption text-foreground-subtle">{hint}</p>
      )}
    </div>
  );
}

/** Tailwind class string shared by inputs/selects/textareas inside a Sheet. */
export const sheetInputClasses =
  "block w-full min-h-12 rounded-control border border-border-2 bg-surface px-3.5 py-2.5 text-body text-foreground placeholder:text-foreground-subtle transition-[border-color,box-shadow] focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900 aria-[invalid=true]:border-danger-600";
