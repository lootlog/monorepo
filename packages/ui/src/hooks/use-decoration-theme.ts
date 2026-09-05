import { useSyncExternalStore } from "react";

const listeners = new Set<() => void>();
let observer: MutationObserver | undefined;

const getSnapshot = () => {
  if (typeof document === "undefined") return null;
  const classes = document.documentElement.classList;
  if (
    ["cat-pink", "cat-purple", "cat-blue"].some((name) =>
      classes.contains(name),
    )
  )
    return "cat";
  if (classes.contains("rukia")) return "rukia";
  if (classes.contains("rias")) return "rias";
  return null;
};

const subscribe = (listener: () => void) => {
  if (typeof document === "undefined") return () => {};
  listeners.add(listener);
  if (!observer) {
    observer = new MutationObserver(() => {
      for (const notify of listeners) notify();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      observer?.disconnect();
      observer = undefined;
    }
  };
};

export function useDecorationTheme() {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
