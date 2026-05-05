"use client";

import { Drawer } from "@/components/Drawer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { MobileTopbar } from "@/components/MobileTopbar";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
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

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      <div className="flex min-h-screen flex-col lg:pl-60">
        <MobileTopbar
          title="TurnoFlash"
          onMenu={() => setDrawerOpen(true)}
        />
        <main className="flex-1">{children}</main>
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
      <DashboardContent>{children}</DashboardContent>
    </ThemeProvider>
  );
}
