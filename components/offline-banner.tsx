"use client";

import { useAuth } from "@/contexts/auth-context";
import { onlineManager } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";
import { useSyncExternalStore } from "react";

/**
 * Says the panel is showing saved data (P2-01). The browser's online flag is
 * often wrong in Cuba, so a failed session check also counts as offline.
 */
export function OfflineBanner() {
  const { connectionError } = useAuth();
  const online = useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    () => true
  );

  if (online && !connectionError) return null;

  return (
    <p className="flex items-center justify-center gap-1.5 bg-warning-50 px-4 py-2 text-center text-xs font-semibold text-warning-800 dark:bg-warning-900/20 dark:text-warning-400 print:hidden">
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      Sin conexión. Ves los últimos datos guardados; para hacer cambios necesitas señal.
    </p>
  );
}
