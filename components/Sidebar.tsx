"use client";

import { useAuth } from "@/contexts/auth-context";
import {
  Bell,
  Calendar,
  Home,
  LogOut,
  Menu,
  Package,
  Settings,
  Users,
  X,
  Building2,
  UserCog,
  UserPlus,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  roles?: string[]; // Si está vacío, todos los roles pueden acceder
  requiresOrg?: boolean; // Requiere organización
}

export function Sidebar() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

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
      {/* Mobile menu button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed left-4 top-4 z-50 rounded-md bg-white p-2 shadow-md dark:bg-zinc-900 lg:hidden"
      >
        {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-white shadow-lg transition-transform duration-200 dark:bg-zinc-900 lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-zinc-200 dark:border-zinc-700">
            <Link
              href="/dashboard"
              className="text-xl font-bold text-blue-600 dark:text-blue-400"
              onClick={() => setIsOpen(false)}
            >
              🗓️ TurnoFlash
            </Link>
          </div>

          {/* User Info */}
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-700">
            <p className="text-sm font-medium text-black dark:text-zinc-50 truncate">
              {profile?.full_name || profile?.email || "Usuario"}
            </p>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {profile?.role === "admin"
                ? "Administrador"
                : profile?.role === "owner"
                ? "Dueño"
                : "Staff"}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {filteredNavItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive(item.href)
                        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                        : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
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
          <div className="border-t border-zinc-200 p-4 dark:border-zinc-700">
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
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
