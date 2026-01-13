"use client";

import { Sidebar } from "@/components/Sidebar";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeProvider } from "@/contexts/theme-context";

/**
 * Layout para el dashboard y sus sub-páginas.
 * Incluye el AuthProvider para manejar el estado de autenticación
 * y el Sidebar para navegación.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-background">
          <Sidebar />
          <main className="lg:pl-64">{children}</main>
        </div>
      </ThemeProvider>
    </AuthProvider>
  );
}
