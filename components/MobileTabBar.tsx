"use client";

import { isNavActive } from "@/components/nav-items";
import { useAuth } from "@/contexts/auth-context";
import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";
import {
  Bus,
  Calendar,
  House,
  LayoutGrid,
  type LucideIcon,
  Plus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

interface TabItem {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
}

const HOME: TabItem = { key: "home", label: "Inicio", href: "/dashboard", icon: House };
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

/**
 * The three destinations next to "+" and "Más", for what this business
 * actually uses. With both modules on, Clientes moves to the "Más" sheet.
 * Without a business (an admin) there is only Inicio.
 */
export function tabsFor(
  hasOrg: boolean,
  appointments: boolean,
  trips: boolean
): TabItem[] {
  if (!hasOrg) return [HOME];
  if (trips && !appointments) return [HOME, TRIPS, CUSTOMERS];
  if (trips && appointments) return [HOME, APPOINTMENTS, TRIPS];
  return [HOME, APPOINTMENTS, CUSTOMERS];
}

interface MobileTabBarProps {
  moreOpen: boolean;
  onMore: () => void;
}

/**
 * Bottom tab bar (mobile only): two tabs, the central "+", a third tab and
 * "Más". The "+" lands on a list page with `create=1`, which opens its create
 * form (useCreateParam).
 */
export function MobileTabBar({ moreOpen, onMore }: MobileTabBarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { profile } = useAuth();
  const { modules } = useOrganizationModules();
  const hasOrg = !!profile?.organization_id;
  const tabs = tabsFor(hasOrg, modules.appointments, modules.trips);
  // In Viajes (or a trips-only business) the "+" creates a departure, which
  // only the owner can do (D-14); everywhere else it creates an appointment.
  const canCreateTrips = profile?.role === "admin" || profile?.role === "owner";
  const createsTrip =
    modules.trips &&
    canCreateTrips &&
    (!modules.appointments || pathname.startsWith("/dashboard/trips"));
  // Staff of a trips-only business can't create departures: just go to Viajes.
  const createHref = createsTrip
    ? "/dashboard/trips?create=1"
    : modules.appointments
      ? "/dashboard/appointments?create=1"
      : "/dashboard/trips";
  // "Más" stands for every screen that has no tab of its own
  const moreActive =
    moreOpen || !tabs.some((t) => isNavActive(pathname, t.href));

  return (
    <div
      data-mobile-tabbar
      className={`sticky bottom-0 z-30 grid items-center border-t border-border bg-surface px-2.5 pt-2 lg:hidden print:hidden ${
        hasOrg ? "grid-cols-5" : "grid-cols-2"
      }`}
      style={{
        paddingBottom: "calc(0.5rem + var(--safe-area-inset-bottom, 0px))",
      }}
    >
      {tabs.slice(0, 2).map((t) => (
        <TabLink
          key={t.key}
          tab={t}
          active={!moreOpen && isNavActive(pathname, t.href)}
        />
      ))}

      {hasOrg && (
        <div className="flex items-center justify-center">
          <button
            onClick={() => router.push(createHref)}
            className="flex h-11 w-14 cursor-pointer items-center justify-center rounded-[14px] bg-primary text-primary-foreground transition-transform active:scale-95"
            aria-label={createsTrip ? "Nueva salida" : "Crear turno"}
          >
            <Plus className="size-6" />
          </button>
        </div>
      )}

      {tabs.slice(2).map((t) => (
        <TabLink
          key={t.key}
          tab={t}
          active={!moreOpen && isNavActive(pathname, t.href)}
        />
      ))}

      <button
        type="button"
        onClick={onMore}
        aria-haspopup="dialog"
        aria-expanded={moreOpen}
        className={`${TAB_CLASSES} cursor-pointer ${
          moreActive ? TAB_ACTIVE : TAB_INACTIVE
        }`}
      >
        <LayoutGrid className="size-[22px]" />
        Más
      </button>
    </div>
  );
}

// Contrast marks the active tab, not colour
const TAB_CLASSES =
  "flex h-12 flex-col items-center justify-center gap-1 text-[11px] transition-colors";
const TAB_ACTIVE = "font-semibold text-foreground";
const TAB_INACTIVE = "font-medium text-foreground-subtle";

function TabLink({ tab, active }: { tab: TabItem; active: boolean }) {
  const Icon = tab.icon;
  return (
    <Link
      href={tab.href}
      aria-current={active ? "page" : undefined}
      className={`${TAB_CLASSES} ${active ? TAB_ACTIVE : TAB_INACTIVE}`}
    >
      <Icon className="size-[22px]" />
      {tab.label}
    </Link>
  );
}
