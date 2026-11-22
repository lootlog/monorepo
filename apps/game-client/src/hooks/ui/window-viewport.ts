import { useSyncExternalStore } from "react";
import { getRuntimeUiScale } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";

export type WindowPosition = { x: number; y: number };

export type WindowSize = { width: number; height: number };

export type WindowViewport = WindowSize & { scale: number };

export const measureWindowViewport = (
  scale: number = getRuntimeUiScale(),
): WindowViewport => ({
  scale,
  width: (window.visualViewport?.width ?? window.innerWidth) * scale,
  height: (window.visualViewport?.height ?? window.innerHeight) * scale,
});

export const clampToViewport = (
  position: WindowPosition,
  size: WindowSize,
  viewport: WindowSize,
): WindowPosition => ({
  x: Math.max(0, Math.min(position.x, viewport.width - size.width)),
  y: Math.max(0, Math.min(position.y, viewport.height - size.height)),
});

const VIEWPORT_RESIZE_DEBOUNCE_MS = 100;

const listeners = new Set<() => void>();

let snapshot: WindowViewport | null = null;

let resizeTimeoutId: number | undefined;

const handleWindowResize = () => {
  window.clearTimeout(resizeTimeoutId);
  resizeTimeoutId = window.setTimeout(() => {
    resizeTimeoutId = undefined;
    const next = measureWindowViewport();

    if (
      snapshot &&
      snapshot.width === next.width &&
      snapshot.height === next.height &&
      snapshot.scale === next.scale
    ) {
      return;
    }

    snapshot = next;
    listeners.forEach((listener) => listener());
  }, VIEWPORT_RESIZE_DEBOUNCE_MS);
};

const subscribe = (listener: () => void) => {
  if (listeners.size === 0) {
    window.addEventListener("resize", handleWindowResize);
    window.visualViewport?.addEventListener("resize", handleWindowResize);
  }

  listeners.add(listener);

  return () => {
    listeners.delete(listener);

    if (listeners.size > 0) return;

    window.removeEventListener("resize", handleWindowResize);
    window.visualViewport?.removeEventListener("resize", handleWindowResize);
    window.clearTimeout(resizeTimeoutId);
    resizeTimeoutId = undefined;
    snapshot = null;
  };
};

const getSnapshot = () => {
  snapshot ??= measureWindowViewport();

  return snapshot;
};

export const useWindowViewport = () =>
  useSyncExternalStore(subscribe, getSnapshot);
