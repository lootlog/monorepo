import { mapValues } from "es-toolkit";
import {
  APP_ERROR_WINDOW_DEFAULT_HEIGHT,
  APP_ERROR_WINDOW_WIDTH,
} from "@/constants/app-error-window";
import type {
  WindowData,
  WindowEntries,
  WindowOpacity,
  WindowPositionState,
  WindowSizeState,
} from "./windows.store";

export const DEFAULT_QUICK_ACCESS_WIDTH = 250;

const DEFAULT_OPACITY: WindowOpacity = 4;

const DEFAULT_POSITION: WindowPositionState = { x: 0, y: 0 };

const DEFAULT_SIZE: WindowSizeState = { width: 242, height: 240 };

export const WINDOW_DEFAULTS = {
  "extension-login": { open: true, size: { width: 360, height: 180 } },
  "app-error": {
    open: false,
    size: {
      width: APP_ERROR_WINDOW_WIDTH,
      height: APP_ERROR_WINDOW_DEFAULT_HEIGHT,
    },
  },
  settings: { open: false, size: { width: 820, height: 560 } },
  timers: { open: true, size: DEFAULT_SIZE },
  chat: { open: true, size: DEFAULT_SIZE },
  "global-chat": { open: false, size: DEFAULT_SIZE },
  command: { open: false, size: DEFAULT_SIZE },
  "online-players": { open: false, size: DEFAULT_SIZE },
  "npc-detector": { open: false, size: { width: 300, height: 300 } },
  notifications: { open: false, size: { width: 360, height: 300 } },
  "quick-access": {
    open: true,
    size: { width: DEFAULT_QUICK_ACCESS_WIDTH, height: 56 },
  },
  "catching-whitelist-warning": {
    open: false,
    size: { width: 400, height: 240 },
  },
  "backend-preferences-warning": {
    open: false,
    size: { width: 400, height: 240 },
  },
  "party-finder": { open: false, size: DEFAULT_SIZE },
  "create-party-gathering": { open: false, size: { width: 280, height: 230 } },
  "battle-pings": { open: false, size: DEFAULT_SIZE },
  "hero-sightings": { open: false, size: { width: 300, height: 260 } },
  "loot-split": { open: false, size: { width: 300, height: 220 } },
} as const satisfies Record<string, Pick<WindowData, "open" | "size">>;

export const createDefaultWindows = (): WindowEntries => {
  const windows = mapValues(WINDOW_DEFAULTS, ({ open, size }): WindowData => ({
    open,
    position: DEFAULT_POSITION,
    hasDefinedPosition: false,
    size,
    opacity: DEFAULT_OPACITY,
    locked: false,
  }));

  return { ...windows, settings: { ...windows.settings, state: {} } };
};
