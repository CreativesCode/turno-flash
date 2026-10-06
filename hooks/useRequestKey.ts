import { useRef } from "react";

// crypto.randomUUID needs Chrome 92+; old Android WebViews (common in Cuba)
// only have getRandomValues.
function newUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/**
 * Idempotency key for a public booking (migration 050). Retrying the same
 * choice reuses the key, so a booking whose response was lost is returned
 * instead of duplicated; a different choice gets a new key.
 */
export function useRequestKey() {
  const current = useRef<{ attempt: string; key: string } | null>(null);
  return {
    keyFor(attempt: string): string {
      if (current.current?.attempt !== attempt) {
        current.current = { attempt, key: newUuid() };
      }
      return current.current.key;
    },
    reset() {
      current.current = null;
    },
  };
}
