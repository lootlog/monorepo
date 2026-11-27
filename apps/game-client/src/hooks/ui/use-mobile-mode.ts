import { useSyncExternalStore } from "react";
import type { MobileUiMode } from "@lootlog/domain/settings-documents";
import {
  measureWindowViewport,
  useWindowViewport,
  type WindowViewport,
} from "@/hooks/ui/window-viewport";
import { useSettingsStore } from "@/store/settings.store";

const MOBILE_COARSE_MAX_WIDTH = 960;

const MOBILE_COARSE_MAX_HEIGHT = 540;

const MOBILE_COARSE_PORTRAIT_MAX_WIDTH = 768;

type MobileOrientation = "portrait" | "landscape";

type MobileModeState = {
  isMobile: boolean;
  orientation: MobileOrientation;
  coarsePointer: boolean;
};

const COARSE_POINTER_QUERY = "(pointer: coarse)";

const readCoarsePointer = (): boolean =>
  window.matchMedia?.(COARSE_POINTER_QUERY)?.matches ?? false;

const coarseListeners = new Set<() => void>();

let coarseSnapshot: boolean | null = null;

let coarseMediaQuery: MediaQueryList | null = null;

const handleCoarsePointerChange = () => {
  const next = readCoarsePointer();

  if (coarseSnapshot === next) return;

  coarseSnapshot = next;
  coarseListeners.forEach((listener) => listener());
};

const subscribeCoarsePointer = (listener: () => void) => {
  if (coarseListeners.size === 0) {
    coarseMediaQuery = window.matchMedia?.(COARSE_POINTER_QUERY) ?? null;
    coarseMediaQuery?.addEventListener?.("change", handleCoarsePointerChange);
  }

  coarseListeners.add(listener);

  return () => {
    coarseListeners.delete(listener);

    if (coarseListeners.size > 0) return;

    coarseMediaQuery?.removeEventListener?.(
      "change",
      handleCoarsePointerChange,
    );
    coarseMediaQuery = null;
    coarseSnapshot = null;
  };
};

const getCoarsePointerSnapshot = () => {
  coarseSnapshot ??= readCoarsePointer();

  return coarseSnapshot;
};

const isMobileViewport = ({
  width,
  height,
  coarsePointer,
}: {
  width: number;
  height: number;
  coarsePointer: boolean;
}): boolean => {
  if (!coarsePointer) return false;

  return (
    width <= MOBILE_COARSE_MAX_WIDTH &&
    (height <= MOBILE_COARSE_MAX_HEIGHT ||
      width <= MOBILE_COARSE_PORTRAIT_MAX_WIDTH)
  );
};

export const resolveMobileMode = ({
  setting,
  viewport,
  coarsePointer,
}: {
  setting: MobileUiMode;
  viewport: WindowViewport;
  coarsePointer: boolean;
}): MobileModeState => {
  const scale = viewport.scale > 0 ? viewport.scale : 1;
  const cssWidth = viewport.width / scale;
  const cssHeight = viewport.height / scale;

  const isMobile =
    setting === "on"
      ? true
      : setting === "off"
        ? false
        : isMobileViewport({
            width: cssWidth,
            height: cssHeight,
            coarsePointer,
          });

  return {
    isMobile,
    orientation: cssWidth > cssHeight ? "landscape" : "portrait",
    coarsePointer,
  };
};

export const isMobileModeActive = (): boolean =>
  resolveMobileMode({
    setting: useSettingsStore.getState().mobileUiMode,
    viewport: measureWindowViewport(),
    coarsePointer: readCoarsePointer(),
  }).isMobile;

export const useMobileMode = (): MobileModeState => {
  const setting = useSettingsStore((state) => state.mobileUiMode);
  const viewport = useWindowViewport();

  const coarsePointer = useSyncExternalStore(
    subscribeCoarsePointer,
    getCoarsePointerSnapshot,
  );

  return resolveMobileMode({ setting, viewport, coarsePointer });
};
