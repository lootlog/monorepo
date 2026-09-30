import { useSyncExternalStore } from "react";
import { getRuntimeUiScale } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";

export type WindowPosition = { x: number; y: number };

export type WindowSize = { width: number; height: number };

/**
 * Viewport bounds in the game's scaled coordinate space, where overlay window
 * positions live. Reading `visualViewport` or `innerWidth` forces the host
 * document to lay out, so callers measure once per interaction or through the
 * shared debounced snapshot below, never per pointer move.
 */
export type WindowViewport = WindowSize & { scale: number };

export const measureWindowViewport = (
  scale: number = getRuntimeUiScale(),
): WindowViewport => ({
  scale,
  width: (window.visualViewport?.width ?? window.innerWidth) * scale,
  height: (window.visualViewport?.height ?? window.innerHeight) * scale,
});

/** Keeps a window's top-left corner inside the viewport, title bar first when it cannot fit. */
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
    // Pinch zoom and on-screen keyboards resize only the visual viewport,
    // which the snapshot is measured from.
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
    // Nothing tracks resizes while unsubscribed, so the next reader re-measures.
    snapshot = null;
  };
};

const getSnapshot = () => {
  snapshot ??= measureWindowViewport();

  return snapshot;
};

/**
 * The current viewport, shared by every open window through one debounced
 * `resize` listener so a browser resize re-renders each window once.
 */
export const useWindowViewport = () =>
  useSyncExternalStore(subscribe, getSnapshot);
