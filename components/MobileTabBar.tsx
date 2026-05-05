"use client";

import { Bell, Calendar, Home, Plus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface TabItem {
  key: string;
  label: string;
  href?: string;
  icon: typeof Home;
}

const TABS: readonly TabItem[] = [
  { key: "home", label: "Inicio", href: "/dashboard", icon: Home },
  {
    key: "appointments",
    label: "Turnos",
    href: "/dashboard/appointments",
    icon: Calendar,
  },
  // Center "+" tab — handled separately as a primary mesh button.
  {
    key: "customers",
    label: "Clientes",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    key: "reminders",
    label: "Avisos",
    href: "/dashboard/reminders",
    icon: Bell,
  },
];

function isTabActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname.startsWith(href);
}

/**
 * Bottom tab bar (mobile only). 5 slots: Inicio, Turnos, central "+", Clientes,
 * Avisos. The "+" jumps to the appointments page with a `create=1` flag — the
 * appointments page can read it to open the create modal once that lands in
 * step 6. For now it just navigates.
 */
export function MobileTabBar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div
      className="sticky bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface px-1 pt-1.5 lg:hidden"
      style={{
        paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {TABS.slice(0, 2).map((t) => (
        <TabLink key={t.key} tab={t} active={isTabActive(pathname, t.href!)} />
      ))}

      <div className="flex items-center justify-center">
        <button
          onClick={() => router.push("/dashboard/appointments?create=1")}
          className="mesh-primary flex h-12 w-12 -translate-y-2 items-center justify-center rounded-2xl text-white shadow-glow-primary transition-transform active:scale-95"
          aria-label="Crear turno"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {TABS.slice(2).map((t) => (
        <TabLink key={t.key} tab={t} active={isTabActive(pathname, t.href!)} />
      ))}
    </div>
  );
}

function TabLink({ tab, active }: { tab: TabItem; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href!}
      className={`flex flex-col items-center gap-0.5 px-1 py-1 text-[10px] transition-colors ${
        active
          ? "font-bold text-primary-600 dark:text-primary-400"
          : "font-medium text-foreground-muted"
      }`}
    >
      <Icon className="h-5 w-5" />
      {tab.label}
    </Link>
  );
}
