import { useSyncExternalStore } from "react";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";
const listeners = new Set<() => void>();
let mediaQuery: MediaQueryList | undefined;

const notify = () => {
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  if (typeof window === "undefined") return () => {};
  if (listeners.size === 0) {
    mediaQuery = window.matchMedia?.(REDUCED_MOTION_QUERY);
    mediaQuery?.addEventListener("change", notify);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      mediaQuery?.removeEventListener("change", notify);
      mediaQuery = undefined;
    }
  };
};

const getSnapshot = () => {
  if (mediaQuery) return mediaQuery.matches;
  return (
    typeof window !== "undefined" &&
    (window.matchMedia?.(REDUCED_MOTION_QUERY).matches ?? false)
  );
};

export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
