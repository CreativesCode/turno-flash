"use client";

import { AuthProvider } from "@/contexts/auth-context";
import { Sidebar } from "@/components/Sidebar";

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
      <div className="min-h-screen bg-zinc-50 dark:bg-black">
        <Sidebar />
        <main className="lg:pl-64">{children}</main>
      </div>
    </AuthProvider>
  );
}
