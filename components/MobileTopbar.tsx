"use client";

import { Logo } from "@/components/ui";
import { Menu } from "lucide-react";
import { ReactNode } from "react";

interface MobileTopbarProps {
  title: string;
  subtitle?: string;
  /** Called when the hamburger is pressed. Owns the drawer state. */
  onMenu: () => void;
  /** Optional trailing action (e.g. + create button). */
  action?: ReactNode;
}

/**
 * Mobile-only top bar (hidden ≥lg). Sticks to the top, respects safe-area,
 * shows hamburger + title + subtitle + optional action button.
 */
export function MobileTopbar({
  title,
  subtitle,
  onMenu,
  action,
}: MobileTopbarProps) {
  return (
    <nav
      className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface px-4 lg:hidden"
      style={{
        paddingTop: "calc(env(safe-area-inset-top, 0px) + 0.875rem)",
        paddingBottom: "0.625rem",
      }}
    >
      <button
        onClick={onMenu}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-muted"
        aria-label="Abrir menú"
      >
        <Menu className="h-5 w-5" />
      </button>
      <Logo size={28} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-bold text-foreground">
          {title}
        </div>
        {subtitle && (
          <div className="truncate text-xs text-foreground-muted">
            {subtitle}
          </div>
        )}
      </div>
      {action}
    </nav>
  );
}
