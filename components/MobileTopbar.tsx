"use client";

import { Avatar, Logo } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Mobile-only top bar (hidden ≥lg). Sticks to the top, respects safe-area and
 * shows the mark, the business name, the reminders bell and the user avatar.
 * The rest of the navigation lives in the tab bar and its "Más" sheet.
 */
export function MobileTopbar() {
  const { profile } = useAuth();
  const { modules } = useOrganizationModules();
  const businessName =
    profile?.organization_id && modules.name ? modules.name : "TurnoFlash";
  const userName = profile?.full_name || profile?.email || "Usuario";

  // The hairline only shows once the content scrolls under the bar
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      data-mobile-topbar
      className={`sticky top-0 z-30 border-b bg-background/90 pl-5 pr-4 backdrop-blur transition-colors lg:hidden print:hidden ${
        scrolled ? "border-border" : "border-transparent"
      }`}
      style={{ paddingTop: "var(--safe-area-inset-top, 0px)" }}
    >
      <div className="flex h-[52px] items-center gap-2.5">
        <Logo size={26} />
        <span className="min-w-0 flex-1 truncate text-body font-semibold tracking-[-0.01em] text-foreground">
          {businessName}
        </span>
        {profile?.organization_id && modules.appointments && (
          <Link
            href="/dashboard/reminders"
            aria-label="Recordatorios"
            className="flex size-11 shrink-0 items-center justify-center text-foreground-muted"
          >
            <Bell className="size-[21px]" />
          </Link>
        )}
        <Link
          href="/dashboard/account"
          aria-label="Mi cuenta"
          className="shrink-0"
        >
          <Avatar
            name={userName}
            size={34}
            className="!bg-secondary-100 !text-secondary-600 dark:!bg-secondary-900 dark:!text-secondary-400"
          />
        </Link>
      </div>
    </nav>
  );
}
