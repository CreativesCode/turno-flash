"use client";

import { ThemeProvider } from "@/contexts/theme-context";

/**
 * Wrapper component para ThemeProvider que aplica la clase al elemento html
 * Debe usarse en el root layout
 */
export function ThemeProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
