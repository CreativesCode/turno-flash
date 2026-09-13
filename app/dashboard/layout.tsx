"use client";

import { Drawer } from "@/components/Drawer";
import { LicenseGate } from "@/components/license-gate";
import { MobileTabBar } from "@/components/MobileTabBar";
import { MobileTopbar } from "@/components/MobileTopbar";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { useRealtimeAll } from "@/hooks/useRealtimeEntities";
import { useState } from "react";

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

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden">
        <Sidebar />
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
      </div>

      <div className="flex min-h-screen flex-col lg:pl-60 print:block print:min-h-0 print:pl-0">
        <div className="print:hidden">
          <MobileTopbar
            title="TurnoFlash"
            onMenu={() => setDrawerOpen(true)}
          />
        </div>
        <main className="flex-1">{children}</main>
        {showTabBar && (
          <div className="print:hidden">
            <MobileTabBar />
          </div>
        )}
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
