import { useEffect, useState } from "react";

function read<T>(key: string, initial: T): T {
  try {
    const saved = window.sessionStorage.getItem(key);
    return saved === null ? initial : (JSON.parse(saved) as T);
  } catch {
    return initial;
  }
}

/**
 * useState that survives a reload of the tab. Android discards background
 * tabs to free memory (the customer switches to WhatsApp and back): without
 * this, a public booking starts over. Storage can throw (private mode, quota):
 * then it is plain useState.
 */
export function useSessionState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() =>
    typeof window === "undefined" ? initial : read(key, initial)
  );

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Not critical: the flow still works, it just does not survive a reload
    }
  }, [key, value]);

  return [value, setValue] as const;
}
