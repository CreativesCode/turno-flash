"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

/**
 * React Query Provider Component
 * Configures the QueryClient with optimized settings
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Configuración optimizada para la app
            staleTime: 1000 * 60, // 1 minuto - datos considerados frescos
            gcTime: 1000 * 60 * 5, // 5 minutos - tiempo en cache después de no usarse
            retry: 1, // Reintentar una vez en caso de error
            refetchOnWindowFocus: true, // Refetch al volver a la ventana
            refetchOnMount: true, // Refetch al montar el componente
            refetchOnReconnect: true, // Refetch al reconectar
          },
          mutations: {
            // Configuración para mutaciones
            retry: 0, // No reintentar mutaciones automáticamente
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
