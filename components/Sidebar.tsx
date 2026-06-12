"use client";

import { Avatar, Logo } from "@/components/ui";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { createClient } from "@/utils/supabase/client";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Building2,
  Calendar,
  Crown,
  Home,
  LogOut,
  type LucideIcon,
  Moon,
  Package,
  Settings,
  Sun,
  UserCircle,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useMemo, useState } from "react";

interface NavItem {
  name: string;
  href: string;
  Icon: LucideIcon;
  roles?: string[];
  requiresOrg?: boolean;
}

interface NavSeparator {
  separator: true;
  key: string;
}

type NavEntry = NavItem | NavSeparator;

const NAV_ITEMS: readonly NavEntry[] = [
  { name: "Dashboard", href: "/dashboard", Icon: Home },
  {
    name: "Turnos",
    href: "/dashboard/appointments",
    Icon: Calendar,
    requiresOrg: true,
  },
  {
    name: "Clientes",
    href: "/dashboard/customers",
    Icon: Users,
    requiresOrg: true,
  },
  {
    name: "Servicios",
    href: "/dashboard/services",
    Icon: Package,
    roles: ["admin", "owner"],
    requiresOrg: true,
  },
  {
    name: "Profesionales",
    href: "/dashboard/staff",
    Icon: UserCog,
    roles: ["admin", "owner"],
    requiresOrg: true,
  },
  {
    name: "Recordatorios",
    href: "/dashboard/reminders",
    Icon: Bell,
    requiresOrg: true,
  },
  {
    name: "Reportes",
    href: "/dashboard/reports",
    Icon: BarChart3,
    roles: ["admin", "owner"],
    requiresOrg: true,
  },
  {
    name: "Ajustes",
    href: "/dashboard/settings",
    Icon: Settings,
    roles: ["admin", "owner"],
    requiresOrg: true,
  },
  {
    name: "Suscripción",
    href: "/dashboard/subscription",
    Icon: Crown,
    roles: ["admin", "owner"],
    requiresOrg: true,
  },
  {
    name: "Mi cuenta",
    href: "/dashboard/account",
    Icon: UserCircle,
  },
  { separator: true, key: "admin" },
  {
    name: "Plataforma",
    href: "/dashboard/platform",
    Icon: Activity,
    roles: ["admin"],
  },
  {
    name: "Organizaciones",
    href: "/dashboard/organizations",
    Icon: Building2,
    roles: ["admin"],
  },
  {
    name: "Usuarios",
    href: "/dashboard/users",
    Icon: Users,
    roles: ["admin"],
  },
  {
    name: "Invitar",
    href: "/dashboard/invite",
    Icon: UserPlus,
    roles: ["admin", "owner"],
  },
  {
    name: "Errores",
    href: "/dashboard/errors",
    Icon: AlertTriangle,
    roles: ["admin"],
  },
];

function isItemVisible(item: NavItem, role?: string, hasOrg?: boolean): boolean {
  if (item.roles && item.roles.length > 0 && (!role || !item.roles.includes(role))) {
    return false;
  }
  if (item.requiresOrg && !hasOrg) {
    return false;
  }
  return true;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === href;
  return pathname.startsWith(href);
}

function roleLabel(role?: string): string {
  if (role === "admin") return "Administrador";
  if (role === "owner") return "Dueño";
  return "Staff";
}

/**
 * Desktop-only persistent sidebar (visible on lg+ via the dashboard layout).
 * The mobile counterpart is `Drawer.tsx`, opened from `MobileTopbar`'s menu.
 * Both components share the same NAV_ITEMS shape but are separate so each can
 * tune its layout independently (drawer has a fixed width on top of content,
 * sidebar is part of the desktop grid).
 */
export const Sidebar = React.memo(function Sidebar() {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [fetchedOrgName, setFetchedOrgName] = useState<string | null>(null);
  // Derivado en render (no en el efecto) para evitar setState síncrono al no haber org
  const organizationName = profile?.organization_id ? fetchedOrgName : null;

  useEffect(() => {
    let mounted = true;
    if (!profile?.organization_id) {
      return;
    }
    supabase
      .from("organizations")
      .select("name")
      .eq("id", profile.organization_id)
      .single()
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setFetchedOrgName(null);
        } else {
          setFetchedOrgName(data?.name ?? null);
        }
      });
    return () => {
      mounted = false;
    };
  }, [profile?.organization_id, supabase]);

  const visibleEntries = useMemo(() => {
    const role = profile?.role;
    const hasOrg = !!profile?.organization_id;
    return NAV_ITEMS.filter((entry) => {
      if ("separator" in entry) return true;
      return isItemVisible(entry, role, hasOrg);
    });
  }, [profile?.role, profile?.organization_id]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
      {/* Brand */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-5">
        <Logo size={36} priority />
        <div className="min-w-0">
          <div className="text-base font-bold tracking-tight text-foreground">
            TurnoFlash
          </div>
          {organizationName && (
            <div className="truncate text-[11px] text-foreground-muted">
              {organizationName}
            </div>
          )}
        </div>
      </div>

      {/* User block */}
      {profile && (
        <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
          <Avatar
            name={profile.full_name || profile.email || "Usuario"}
            color="var(--color-secondary-500)"
            size={36}
          />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-foreground">
              {profile.full_name || profile.email || "Usuario"}
            </div>
            <div className="text-[11px] text-foreground-muted">
              {roleLabel(profile.role)}
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-2.5">
        {visibleEntries.map((entry) => {
          if ("separator" in entry) {
            return (
              <div
                key={entry.key}
                className="my-2 mx-2 h-px bg-border"
                aria-hidden
              />
            );
          }
          const active = isActive(pathname, entry.href);
          const Icon = entry.Icon;
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                active
                  ? "bg-primary-50 font-bold text-primary-500 dark:bg-primary-900/30"
                  : "font-medium text-foreground-muted hover:bg-muted hover:text-foreground"
              }`}
            >
              {active && (
                <span
                  aria-hidden
                  className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-primary-500"
                />
              )}
              <Icon
                className={`h-4.25 w-4.25 ${active ? "text-primary-500" : ""}`}
              />
              {entry.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="flex flex-col gap-1 border-t border-border p-3">
        <button
          onClick={toggleTheme}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-foreground-muted transition-colors hover:bg-muted"
        >
          {theme === "dark" ? (
            <>
              <Sun className="h-4.25 w-4.25" />
              Tema claro
            </>
          ) : (
            <>
              <Moon className="h-4.25 w-4.25" />
              Tema oscuro
            </>
          )}
        </button>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium text-danger transition-colors hover:bg-danger-50 dark:hover:bg-danger-900/20"
        >
          <LogOut className="h-4.25 w-4.25" />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
});
