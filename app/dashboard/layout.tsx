"use client";

import { MobileNavbar } from "@/components/MobileNavbar";
import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";
import { useCapacitor } from "@/hooks/useCapacitor";
import { useState } from "react";

/**
 * Layout para el dashboard y sus sub-páginas.
 * Incluye el AuthProvider para manejar el estado de autenticación,
 * el Sidebar para navegación, y el MobileNavbar para móviles.
 * Maneja safe areas para Capacitor.
 */
function DashboardContent({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isMobile } = useCapacitor();

  const closeSidebar = () => setSidebarOpen(false);
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  return (
    <div
      className="min-h-screen bg-background"
      style={{
        paddingTop: isMobile
          ? "calc(env(safe-area-inset-top, 0px) + 3.5rem)"
          : 0,
        paddingLeft: 0,
        paddingRight: 0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Mobile Navbar - Solo visible en móvil */}
      <MobileNavbar
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        title="TurnoFlash"
      />

      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />

      {/* Main Content */}
      <main className="lg:pl-64 min-h-screen">{children}</main>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DashboardContent>{children}</DashboardContent>
      </ThemeProvider>
    </AuthProvider>
  );
}
