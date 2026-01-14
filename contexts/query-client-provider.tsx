"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";

/**
 * React Query Provider Component
 * Configures the QueryClient with optimized settings to prevent hangs
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
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Backoff exponencial (máx 10s)
            refetchOnWindowFocus: true, // Refetch al volver a la ventana
            refetchOnMount: true, // Refetch al montar el componente
            refetchOnReconnect: true, // Refetch al reconectar
            // Configuración para prevenir queries colgadas
            networkMode: "always", // Siempre intentar, incluso offline
          },
          mutations: {
            // Configuración para mutaciones
            retry: 0, // No reintentar mutaciones automáticamente
            networkMode: "always", // Siempre intentar, incluso offline
            // Callback global para errores de mutación
            onError: (error) => {
              console.error("Mutation error:", error);
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
