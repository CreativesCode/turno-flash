"use client";

import { QueryClient } from "@tanstack/react-query";
import {
  PersistQueryClientProvider,
  type PersistedClient,
  type Persister,
} from "@tanstack/react-query-persist-client";
import { ReactNode, useState } from "react";

const PERSIST_KEY = "turnoflash:query-cache";
const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24;
const PERSIST_THROTTLE_MS = 1000;

/**
 * What the owner needs to read their day without signal (P2-01): agenda,
 * departures and passengers, catalogs, organization and license. Free slots,
 * seats left and customers always come from the server.
 */
const PERSISTED_ROOTS = new Set<unknown>([
  "appointments",
  "trips",
  "trip-bookings",
  "services",
  "staff",
  "organization-modules",
  "license",
]);

let persistTimer: ReturnType<typeof setTimeout> | null = null;

/** Saved in localStorage: a few KB, synchronous, and kept by the native WebView. */
const persister: Persister = {
  persistClient: (client: PersistedClient) => {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      try {
        window.localStorage.setItem(PERSIST_KEY, JSON.stringify(client));
      } catch {
        // Private mode or quota: the app works, it just will not open offline
      }
    }, PERSIST_THROTTLE_MS);
  },
  restoreClient: () => {
    try {
      const saved = window.localStorage.getItem(PERSIST_KEY);
      return saved ? (JSON.parse(saved) as PersistedClient) : undefined;
    } catch {
      return undefined;
    }
  },
  removeClient: () => {
    try {
      window.localStorage.removeItem(PERSIST_KEY);
    } catch {
      // Nothing to remove
    }
  },
};

/** Forgets the saved data, so the next user of the device does not see it. */
export function clearPersistedQueries() {
  if (persistTimer) clearTimeout(persistTimer);
  persister.removeClient();
}

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
            // As long as the saved copy: a query collected earlier is not saved
            gcTime: PERSIST_MAX_AGE,
            // Cuban mobile data drops often: a failed fetch is usually a hiccup
            retry: 2,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000), // Backoff exponencial (máx 10s)
            refetchOnWindowFocus: true, // Refetch al volver a la ventana
            refetchOnMount: true, // Refetch al montar el componente
            refetchOnReconnect: true, // Refetch al reconectar
            // Tries once even when the browser says offline (it is often
            // wrong), then waits for the connection instead of failing
            networkMode: "offlineFirst",
          },
          mutations: {
            // Configuración para mutaciones
            retry: 0, // No reintentar mutaciones automáticamente
            // Writes fail right away without signal instead of queueing:
            // there is no offline write queue (they decide seats and money)
            networkMode: "always",
            // No global onError: the services already log their failures,
            // and a second generic row per error hid the real message
          },
        },
      })
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE,
        buster: process.env.NEXT_PUBLIC_BUILD_ID,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" && PERSISTED_ROOTS.has(query.queryKey[0]),
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
