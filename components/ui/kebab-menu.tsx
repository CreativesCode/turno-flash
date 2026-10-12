"use client";

import { EllipsisVertical } from "lucide-react";
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
  /** Opens upwards: for a trigger at the bottom of the screen. */
  placement?: "bottom" | "top";
}

/**
 * Three-dot action menu for entity cards. Closes on outside click and Escape.
 * Same look as the inline menus in StaffCard / CustomerCard.
 */
export function KebabMenu({
  items,
  label = "Más acciones",
  placement = "bottom",
}: KebabMenuProps) {
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
        className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-control text-foreground-subtle transition-colors hover:bg-muted hover:text-foreground"
      >
        <EllipsisVertical className="size-5" />
      </button>
      {open && (
        <div
          role="menu"
          data-menu-open
          className={`absolute right-0 z-20 min-w-44 ${
            placement === "top" ? "bottom-11" : "top-11"
          } rounded-[14px] border border-border bg-surface p-1.5 shadow-[0_12px_32px_-12px_rgba(22,23,20,.25)]`}
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
              className={`flex h-10 w-full cursor-pointer items-center gap-2 whitespace-nowrap rounded-[9px] px-3 text-left text-body transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                item.danger
                  ? "text-danger-600 hover:bg-muted dark:text-danger-400"
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
