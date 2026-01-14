"use client";

import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useCapacitor } from "@/hooks/useCapacitor";
import { createClient } from "@/utils/supabase/client";
import {
  AlertTriangle,
  Bell,
  Building2,
  Calendar,
  Home,
  LogOut,
  Moon,
  Package,
  Sun,
  UserCog,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[]; // Si está vacío, todos los roles pueden acceder
  requiresOrg?: boolean; // Requiere organización
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { profile, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile } = useCapacitor();
  const supabase = useMemo(() => createClient(), []);
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  // Navigation items with permissions
  const navItems: NavItem[] = useMemo(
    () => [
      {
        name: "Dashboard",
        href: "/dashboard",
        icon: <Home className="h-5 w-5" />,
      },
      {
        name: "Turnos",
        href: "/dashboard/appointments",
        icon: <Calendar className="h-5 w-5" />,
        requiresOrg: true,
      },
      {
        name: "Clientes",
        href: "/dashboard/customers",
        icon: <Users className="h-5 w-5" />,
        requiresOrg: true,
      },
      {
        name: "Servicios",
        href: "/dashboard/services",
        icon: <Package className="h-5 w-5" />,
        roles: ["admin", "owner"],
        requiresOrg: true,
      },
      {
        name: "Profesionales",
        href: "/dashboard/staff",
        icon: <UserCog className="h-5 w-5" />,
        roles: ["admin", "owner"],
        requiresOrg: true,
      },
      {
        name: "Recordatorios",
        href: "/dashboard/reminders",
        icon: <Bell className="h-5 w-5" />,
        requiresOrg: true,
      },
      // Admin only
      {
        name: "Organizaciones",
        href: "/dashboard/organizations",
        icon: <Building2 className="h-5 w-5" />,
        roles: ["admin"],
      },
      {
        name: "Usuarios",
        href: "/dashboard/users",
        icon: <Users className="h-5 w-5" />,
        roles: ["admin"],
      },
      {
        name: "Invitar",
        href: "/dashboard/invite",
        icon: <UserPlus className="h-5 w-5" />,
        roles: ["admin", "owner"],
      },
      {
        name: "Errores",
        href: "/dashboard/errors",
        icon: <AlertTriangle className="h-5 w-5" />,
        roles: ["admin"],
      },
    ],
    []
  );

  // Filter nav items based on user role and organization
  const filteredNavItems = useMemo(() => {
    return navItems.filter((item) => {
      // Check role permission
      if (item.roles && item.roles.length > 0) {
        if (!profile?.role || !item.roles.includes(profile.role)) {
          return false;
        }
      }

      // Check organization requirement
      if (item.requiresOrg && !profile?.organization_id) {
        return false;
      }

      return true;
    });
  }, [navItems, profile]);

  // Cargar nombre de la organización
  useEffect(() => {
    const loadOrganizationName = async () => {
      if (!profile?.organization_id) {
        setOrganizationName(null);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("organizations")
          .select("name")
          .eq("id", profile.organization_id)
          .single();

        if (error) {
          console.error("Error loading organization name:", error);
          setOrganizationName(null);
        } else {
          setOrganizationName(data?.name || null);
        }
      } catch (error) {
        console.error("Error loading organization name:", error);
        setOrganizationName(null);
      }
    };

    if (profile) {
      loadOrganizationName();
    }
  }, [profile, supabase]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-40 w-64 transform bg-surface shadow-lg transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={
          isMobile
            ? {
                top: "calc(env(safe-area-inset-top, 0px) + 3.5rem)",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }
            : undefined
        }
      >
        <div className="flex h-full flex-col">
          {/* Logo - Solo visible en desktop */}
          <div className="hidden lg:flex h-16 items-center justify-center border-b border-border">
            <Link
              href="/dashboard"
              className="text-xl font-bold text-info"
              onClick={onClose}
            >
              🗓️ TurnoFlash
            </Link>
          </div>

          {/* User Info */}
          <div className="border-b border-border p-4">
            <p className="text-sm font-medium text-foreground truncate">
              {profile?.full_name || profile?.email || "Usuario"}
            </p>
            <p className="mt-1 text-xs text-foreground-muted">
              {profile?.role === "admin"
                ? "Administrador"
                : profile?.role === "owner"
                ? "Dueño"
                : "Staff"}
              {": "}
              <span className="font-semibold">{organizationName}</span>
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 pb-safe">
            <ul className="space-y-1">
              {filteredNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-primary-50 text-primary-700 dark:bg-primary-900/40 dark:text-primary-200"
                        : "text-foreground-muted hover:bg-muted"
                    }`}
                  >
                    {item.icon}
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Footer */}
          <div className="border-t border-border p-4 space-y-2">
            <button
              onClick={toggleTheme}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-foreground-muted transition-colors hover:bg-muted"
              aria-label={
                theme === "dark"
                  ? "Cambiar a tema claro"
                  : "Cambiar a tema oscuro"
              }
            >
              {theme === "dark" ? (
                <>
                  <Sun className="h-5 w-5" />
                  Tema Claro
                </>
              ) : (
                <>
                  <Moon className="h-5 w-5" />
                  Tema Oscuro
                </>
              )}
            </button>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger-50 dark:hover:bg-danger-900/20"
            >
              <LogOut className="h-5 w-5" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
