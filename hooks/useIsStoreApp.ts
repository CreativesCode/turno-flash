import { Capacitor } from "@capacitor/core";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/**
 * True inside the app installed from a store (Capacitor), false on the web.
 *
 * The store app is "consumption only": the license is paid outside it, so
 * Google Play's payments policy does not allow it to show prices, explain
 * how to pay or lead the user to a payment. Those parts are web only.
 * False while prerendering, so the static pages hydrate without a mismatch.
 */
export function useIsStoreApp(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => Capacitor.isNativePlatform(),
    () => false
  );
}
