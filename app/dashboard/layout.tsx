"use client";

import { AuthProvider } from "@/contexts/auth-context";

/**
 * Layout para el dashboard y sus sub-páginas.
 * Incluye el AuthProvider para manejar el estado de autenticación.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthProvider>{children}</AuthProvider>;
}
