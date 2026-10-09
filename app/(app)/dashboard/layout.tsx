"use client";

import { Drawer } from "@/components/Drawer";
import { LicenseGate } from "@/components/license-gate";
import { MobileTabBar } from "@/components/MobileTabBar";
import { MobileTopbar } from "@/components/MobileTopbar";
import { OfflineBanner } from "@/components/offline-banner";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { useCapacitor } from "@/hooks/useCapacitor";
import { useOrganizationModules } from "@/hooks/useOrganizationModules.query";
import { useRealtimeAll } from "@/hooks/useRealtimeEntities";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Sections that only exist for a business with that module on. */
const MODULE_ROUTES = {
  appointments: [
    "/dashboard/appointments",
    "/dashboard/services",
    "/dashboard/staff",
    "/dashboard/reminders",
    "/dashboard/reports",
  ],
  trips: ["/dashboard/trips"],
} as const;

/**
 * Dashboard layout. Mobile gets a sticky topbar + sliding drawer + bottom tab
 * bar; desktop gets a fixed left sidebar. Both share the same nav data and
 * read profile/role from AuthProvider (mounted in the root layout).
 */
function DashboardContent({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { profile } = useAuth();
  const showTabBar = !!profile?.organization_id;

  // Suscribir realtime a todas las tablas operativas core mientras
  // el usuario está dentro del dashboard. Los hooks se auto-deshabilitan
  // si no hay organization_id y se limpian al desmontar.
  useRealtimeAll();

  // A typed or saved link to a section of a module the business does not
  // have goes back to Inicio. Admins are never redirected.
  const pathname = usePathname();
  const router = useRouter();
  const { modules, ready } = useOrganizationModules();
  const blockedByModule =
    ready &&
    !!profile?.organization_id &&
    profile.role !== "admin" &&
    (["appointments", "trips"] as const).some(
      (key) =>
        !modules[key] &&
        MODULE_ROUTES[key].some((route) => pathname.startsWith(route))
    );
  useEffect(() => {
    if (blockedByModule) router.replace("/dashboard");
  }, [blockedByModule, router]);

  // Keeps the native status bar readable in both themes
  useCapacitor();

  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <Sidebar />
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>

      <div className="flex min-h-screen flex-col lg:pl-60 print:block print:min-h-0 print:pl-0">
        <MobileTopbar
          title="TurnoFlash"
          onMenu={() => setDrawerOpen(true)}
          action={
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={refreshing}
              aria-label="Actualizar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
            </button>
          }
        />
        <OfflineBanner />
        <main className="flex-1">{blockedByModule ? null : children}</main>
        {showTabBar && <MobileTabBar />}
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <LicenseGate>
        <DashboardContent>{children}</DashboardContent>
      </LicenseGate>
    </ThemeProvider>
  );
}
