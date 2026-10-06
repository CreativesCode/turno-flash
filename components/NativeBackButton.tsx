"use client";

import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { useEffect } from "react";

/**
 * Android hardware back button in the native app. Without a listener Capacitor
 * closes the app on back. Open sheets and the drawer are history entries
 * (useBackToClose) and public booking steps too (useStepHistory), so going
 * back in history closes the overlay or returns one step; with nothing left
 * the app is minimized instead of closed.
 */
export function NativeBackButton() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    const listener = App.addListener("backButton", ({ canGoBack }) => {
      if (canGoBack) window.history.back();
      else void App.minimizeApp();
    });
    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);

  return null;
}
