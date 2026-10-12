"use client";

import { isNavActive, visibleNavGroups } from "@/components/nav-items";
import { Avatar, KebabMenu, Logo, SectionLabel } from "@/components/ui";
import { ROLE_META } from "@/components/users/UserCard";
import { useAuth } from "@/contexts/auth-context";
import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";
import { useTheme } from "@/contexts/theme-context";
import { LogOut, Moon, Sun, UserCircle } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useMemo } from "react";

/**
 * Desktop-only persistent sidebar (visible on lg+ via the dashboard layout).
 * The mobile counterpart is the tab bar plus `MoreSheet.tsx`; both read the
 * same groups from `nav-items.ts`.
 */
export const Sidebar = React.memo(function Sidebar() {
  const { profile, signOut } = useAuth();
  const { modules } = useOrganizationModules();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  // From the shared, cached organization query (P2-04): no fetch of its own
  const organizationName =
    profile?.organization_id && modules.name ? modules.name : null;

  const groups = useMemo(
    () =>
      visibleNavGroups(profile?.role, !!profile?.organization_id, modules),
    [profile?.role, profile?.organization_id, modules]
  );

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const userName = profile?.full_name || profile?.email || "Usuario";

  return (
    <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-64 flex-col border-r border-border bg-surface lg:flex">
      {/* Brand */}
      <div className="px-5 pb-2 pt-6">
        <Logo size={28} withWordmark />
        {organizationName && (
          <div className="mt-1.5 truncate text-meta text-foreground-subtle">
            {organizationName}
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="scrollbar-discreet flex-1 overflow-y-auto px-3 pb-3 pt-2">
        {groups.map((group) => (
          <div key={group.key}>
            {group.label && (
              <SectionLabel className="!px-3 !pb-1.5 !pt-5">
                {group.label}
              </SectionLabel>
            )}
            {group.items.map((item) => {
              const active = isNavActive(pathname, item.href);
              const Icon = item.Icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-10 items-center gap-3 rounded-control px-3 text-body transition-colors ${
                    active
                      ? "bg-surface-2 font-semibold text-foreground"
                      : "font-medium text-foreground-muted hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon
                    className={`size-[18px] ${active ? "text-primary" : ""}`}
                  />
                  {item.name}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User block */}
      {profile && (
        <div className="flex items-center gap-3 border-t border-border py-3 pl-5 pr-2">
          <Avatar name={userName} seed={profile.id} size={36} />
          <div className="min-w-0 flex-1">
            <div className="truncate text-meta font-semibold text-foreground">
              {userName}
            </div>
            <div className="text-caption text-foreground-subtle">
              {ROLE_META[profile.role].label}
            </div>
          </div>
          <KebabMenu
            label="Opciones de la cuenta"
            placement="top"
            items={[
              {
                label: theme === "dark" ? "Tema claro" : "Tema oscuro",
                icon:
                  theme === "dark" ? (
                    <Sun className="size-4" />
                  ) : (
                    <Moon className="size-4" />
                  ),
                onClick: toggleTheme,
              },
              {
                label: "Mi cuenta",
                icon: <UserCircle className="size-4" />,
                onClick: () => router.push("/dashboard/account"),
              },
              {
                label: "Cerrar sesión",
                icon: <LogOut className="size-4" />,
                danger: true,
                onClick: () => void handleSignOut(),
              },
            ]}
          />
        </div>
      )}
    </aside>
  );
});
