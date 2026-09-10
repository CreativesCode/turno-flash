"use client";

import { MoreVertical } from "lucide-react";
import { ReactNode, useEffect, useRef, useState } from "react";

export interface KebabMenuItem {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  /** Renders the item in the danger color (destructive actions). */
  danger?: boolean;
  disabled?: boolean;
}

export interface KebabMenuProps {
  items: KebabMenuItem[];
  /** Accessible label for the trigger button. */
  label?: string;
}

/**
 * Three-dot action menu for entity cards. Closes on outside click and Escape.
 * Same look as the inline menus in StaffCard / CustomerCard.
 */
export function KebabMenu({ items, label = "Más acciones" }: KebabMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-muted hover:text-foreground"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-10 z-20 w-48 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                item.onClick();
              }}
              className={`flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                item.danger
                  ? "text-danger-600 hover:bg-danger-50 dark:hover:bg-danger-900/20"
                  : "text-foreground hover:bg-muted"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
