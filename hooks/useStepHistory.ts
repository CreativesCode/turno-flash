import { useCallback, useEffect, useState } from "react";

/**
 * Steps of a multi-step flow backed by the browser history, so the phone's
 * back button/gesture goes to the previous step instead of leaving the page
 * (back to WhatsApp, where the link was opened) and losing everything.
 *
 * Next.js (14.1+) supports native pushState; the existing state is spread to
 * keep the router's own keys.
 */
export function useStepHistory<S extends string>(initial: S) {
  const [step, setStep] = useState<S>(initial);

  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      const saved = (event.state as { flowStep?: S } | null)?.flowStep;
      setStep(saved ?? initial);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [initial]);

  const write = useCallback(
    (next: S, mode: "push" | "replace") => {
      const state = { ...window.history.state, flowStep: next };
      if (mode === "push") window.history.pushState(state, "");
      else window.history.replaceState(state, "");
      setStep(next);
    },
    []
  );

  return {
    step,
    /** Moves forward, adding a history entry. */
    go: useCallback((next: S) => write(next, "push"), [write]),
    /** Changes the step without a new entry (results, resets). */
    replace: useCallback((next: S) => write(next, "replace"), [write]),
    /** Same as the phone's back button: `steps` entries back. */
    back: useCallback((steps = 1) => window.history.go(-steps), []),
  };
}
