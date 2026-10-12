"use client";

import { tabsFor } from "@/components/MobileTabBar";
import { visibleNavGroups } from "@/components/nav-items";
import {
  Avatar,
  Button,
  IconTile,
  ListGroup,
  SectionLabel,
  SegmentedControl,
  Sheet,
} from "@/components/ui";
import { ROLE_META } from "@/components/users/UserCard";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";
import { ChevronRight, type LucideIcon, RefreshCw, SunMoon } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useMemo } from "react";

interface MoreSheetProps {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
  refreshing: boolean;
}

const ROW = "flex items-center gap-3.5 bg-surface px-4 py-3 text-left";

function RowBody({
  Icon,
  label,
  trailing,
}: {
  Icon: LucideIcon;
  label: string;
  trailing: ReactNode;
}) {
  return (
    <>
      <IconTile size={36}>
        <Icon />
      </IconTile>
      <span className="min-w-0 flex-1 truncate text-body font-medium text-foreground">
        {label}
      </span>
      {trailing}
    </>
  );
}

const CHEVRON = (
  <ChevronRight aria-hidden className="size-[18px] text-foreground-subtle" />
);

/**
 * Everything that has no tab of its own, as a bottom sheet opened from the
 * "Más" tab. Mobile only: the desktop Sidebar lists the same groups.
 */
export function MoreSheet({
  open,
  onClose,
  onRefresh,
  refreshing,
}: MoreSheetProps) {
  const { profile, signOut } = useAuth();
  const { modules } = useOrganizationModules();
  const { theme, setTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const hasOrg = !!profile?.organization_id;

  const groups = useMemo(() => {
    const inTabBar = tabsFor(hasOrg, modules.appointments, modules.trips).map(
      (tab) => tab.href
    );
    const visible = visibleNavGroups(profile?.role, hasOrg, modules);
    // A main destination left out of the bar (Clientes, with both modules on)
    // is listed with the business ones
    const leftOut =
      visible
        .find((group) => group.key === "main")
        ?.items.filter((item) => !inTabBar.includes(item.href)) ?? [];
    return visible
      .filter((group) => group.key !== "main")
      .map((group) =>
        group.key === "business"
          ? { ...group, items: [...leftOut, ...group.items] }
          : group
      );
  }, [profile?.role, hasOrg, modules]);

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const userName = profile?.full_name || profile?.email || "Usuario";

  return (
    <Sheet open={open} onClose={onClose} title="Más" hideTitle>
      {profile && (
        <ListGroup>
          <div className={ROW}>
            <Avatar name={userName} seed={profile.id} size={40} />
            <div className="min-w-0">
              <div className="truncate text-body font-semibold text-foreground">
                {userName}
              </div>
              <div className="text-meta text-foreground-subtle">
                {ROLE_META[profile.role].label}
              </div>
            </div>
          </div>
        </ListGroup>
      )}

      {groups.map((group) => (
        <div key={group.key}>
          <SectionLabel>{group.label}</SectionLabel>
          <ListGroup>
            {group.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                // The sheet closes by itself when the route changes; closing
                // it here too would step back in history over the navigation
                onClick={item.href === pathname ? onClose : undefined}
                className={`${ROW} transition-colors hover:bg-muted`}
              >
                <RowBody Icon={item.Icon} label={item.name} trailing={CHEVRON} />
              </Link>
            ))}
            {group.key === "account" && (
              <>
                <div className={ROW}>
                  <RowBody
                    Icon={SunMoon}
                    label="Tema"
                    trailing={
                      <SegmentedControl
                        label="Tema"
                        value={theme}
                        onChange={setTheme}
                        options={[
                          { value: "light", label: "Claro" },
                          { value: "dark", label: "Oscuro" },
                        ]}
                      />
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={onRefresh}
                  disabled={refreshing}
                  className={`${ROW} cursor-pointer transition-colors hover:bg-muted disabled:opacity-60`}
                >
                  <RowBody
                    Icon={RefreshCw}
                    label={refreshing ? "Actualizando…" : "Actualizar datos"}
                    trailing={null}
                  />
                </button>
              </>
            )}
          </ListGroup>
        </div>
      ))}

      <Button
        variant="danger"
        size="lg"
        className="mt-7 w-full"
        onClick={() => void handleSignOut()}
      >
        Cerrar sesión
      </Button>
    </Sheet>
  );
}
