import { useCallback, useEffect, useRef } from "react";

/**
 * The phone's back button/gesture closes the open overlay (sheet, drawer)
 * instead of leaving the screen with a half-filled form.
 *
 * Each open overlay pushes one history entry; back pops it and closes only the
 * topmost overlay (a confirmation over a sheet closes alone). Closing from the
 * UI (X, overlay, save) removes that entry again with history.back(), which
 * the shared listener then ignores.
 */
type Overlay = { close: () => void };

const stack: Overlay[] = [];
let ownBacks = 0;
let listening = false;

function onPopState() {
  if (ownBacks > 0) {
    ownBacks--;
    return;
  }
  stack.pop()?.close();
}

export function useBackToClose(open: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const entryRef = useRef<Overlay | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!listening) {
      window.addEventListener("popstate", onPopState);
      listening = true;
    }
    const entry: Overlay = { close: () => onCloseRef.current() };
    entryRef.current = entry;
    stack.push(entry);
    window.history.pushState({ ...window.history.state, tfOverlay: true }, "");

    return () => {
      entryRef.current = null;
      const index = stack.indexOf(entry);
      if (index === -1) return; // closed by back: its entry is already gone
      stack.splice(index, 1);
      // Unmounted by a navigation (session expired, redirect): the current
      // entry is no longer ours, and going back would undo that navigation.
      if (!window.history.state?.tfOverlay) return;
      ownBacks++;
      window.history.back();
    };
  }, [open]);

  /**
   * Call before closing to navigate somewhere else (drawer links, logout):
   * forgets the overlay without history.back(), which would undo the
   * navigation. The leftover entry points to the same page, so it is harmless.
   */
  return useCallback(() => {
    const entry = entryRef.current;
    const index = entry ? stack.indexOf(entry) : -1;
    if (index !== -1) stack.splice(index, 1);
  }, []);
}
