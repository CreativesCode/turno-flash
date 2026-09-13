"use client";

import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";
import { Bell, Bus, Calendar, Home, Plus, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface TabItem {
  key: string;
  label: string;
  href?: string;
  icon: typeof Home;
}

const HOME: TabItem = { key: "home", label: "Inicio", href: "/dashboard", icon: Home };
const APPOINTMENTS: TabItem = {
  key: "appointments",
  label: "Turnos",
  href: "/dashboard/appointments",
  icon: Calendar,
};
const TRIPS: TabItem = {
  key: "trips",
  label: "Viajes",
  href: "/dashboard/trips",
  icon: Bus,
};
const CUSTOMERS: TabItem = {
  key: "customers",
  label: "Clientes",
  href: "/dashboard/customers",
  icon: Users,
};
const REMINDERS: TabItem = {
  key: "reminders",
  label: "Avisos",
  href: "/dashboard/reminders",
  icon: Bell,
};

/**
 * The bar has 4 slots plus the central "+", so it shows what this business
 * actually uses: a bus agency has no appointments to create, and Avisos is
 * about appointment reminders.
 */
function tabsFor(appointments: boolean, trips: boolean): TabItem[] {
  if (trips && !appointments) return [HOME, TRIPS, CUSTOMERS, REMINDERS];
  if (trips && appointments) return [HOME, APPOINTMENTS, TRIPS, CUSTOMERS];
  return [HOME, APPOINTMENTS, CUSTOMERS, REMINDERS];
}

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
  const { modules } = useOrganizationModules();
  const tabs = tabsFor(modules.appointments, modules.trips);
  // The "+" goes wherever this business creates things. The trips page has
  // its own "Nueva salida" button, so it needs no create flag.
  const createHref = modules.appointments
    ? "/dashboard/appointments?create=1"
    : "/dashboard/trips";

  return (
    <div
      className="sticky bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface px-1 pt-1.5 lg:hidden"
      style={{
        paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))",
      }}
    >
      {tabs.slice(0, 2).map((t) => (
        <TabLink key={t.key} tab={t} active={isTabActive(pathname, t.href!)} />
      ))}

      <div className="flex items-center justify-center">
        <button
          onClick={() => router.push(createHref)}
          className="mesh-primary flex h-12 w-12 -translate-y-2 items-center justify-center rounded-2xl text-white shadow-glow-primary transition-transform active:scale-95"
          aria-label={modules.appointments ? "Crear turno" : "Nueva salida"}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {tabs.slice(2).map((t) => (
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
