import type { SettingsTabValue } from "@/features/settings/constants/settings-tabs";
import {
  APP_ERROR_WINDOW_DEFAULT_HEIGHT,
  APP_ERROR_WINDOW_WIDTH,
} from "@/features/error-boundary/error-boundary.constants";
import type { GameNpc } from "@lootlog/margonem/npcs";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";

const STORAGE_KEY = storageKey("ll-windows-state");

type CreateNotificationState = {
  npc?: GameNpc;
};

type SettingsWindowState = {
  activeTab?: SettingsTabValue;
};

type AddTimerWindowState = {
  guildId?: string;
};

export type WindowId =
  | "app-error"
  | "settings"
  | "timers"
  | "chat"
  | "command"
  | "online-players"
  | "add-timer"
  | "npc-detector"
  | "notifications"
  | "create-notification"
  | "quick-access"
  | "timer-settings-conflict"
  | "catching-whitelist-warning"
  | "backend-preferences-warning"
  | "party-finder"
  | "create-party-gathering"
  | "event-mode";

interface WindowPositionState {
  x: number;
  y: number;
}

export type WindowOpacity = 1 | 2 | 3 | 4 | 5;

interface WindowSizeState {
  width: number;
  height: number;
}

interface WindowData {
  open: boolean;
  position: WindowPositionState;
  hasDefinedPosition: boolean;
  size: WindowSizeState;
  opacity: WindowOpacity;
  locked: boolean;
  autofocus?: boolean;
  maxContentHeight?: number;
}

interface WindowsState {
  "app-error": WindowData;
  settings: WindowData & { state: SettingsWindowState };
  timers: WindowData;
  chat: WindowData;
  command: WindowData;
  "online-players": WindowData;
  "add-timer": WindowData & { state: AddTimerWindowState };
  "npc-detector": WindowData;
  notifications: WindowData;
  "create-notification": WindowData & { state: CreateNotificationState };
  "quick-access": WindowData;
  "timer-settings-conflict": WindowData;
  "catching-whitelist-warning": WindowData;
  "backend-preferences-warning": WindowData;
  "party-finder": WindowData;
  "create-party-gathering": WindowData;
  "event-mode": WindowData;
  currentWindowFocus?: WindowId;
  windowFocusHistory: WindowId[];
  setCurrentWindowFocus: (key: WindowId) => void;
  setOpen: <T = unknown>(window: WindowId, open: boolean, state?: T) => void;
  setPosition: (window: WindowId, pos: WindowPositionState) => void;
  setSize: (window: WindowId, size: WindowSizeState) => void;
  setMaxContentHeight: (window: WindowId, height: number) => void;
  setOpacity: (window: WindowId, opacity: WindowOpacity) => void;
  setLocked: (window: WindowId, locked: boolean) => void;
  toggleOpen: (window: WindowId, autofocus?: boolean) => void;
  setAutofocus: (window: WindowId, autofocus: boolean) => void;
  setSettingsActiveTab: (activeTab?: SettingsTabValue) => void;
}

const DEFAULT_OPACITY: WindowOpacity = 4;
const DEFAULT_POSITION: WindowPositionState = { x: 0, y: 0 };
const DEFAULT_SIZE: WindowSizeState = { width: 242, height: 240 };

const createDefaultEventModeWindow = (): WindowData => ({
  open: true,
  position: DEFAULT_POSITION,
  hasDefinedPosition: false,
  size: { width: 290, height: 132 },
  opacity: DEFAULT_OPACITY,
  locked: false,
});

const sanitizeMaxContentHeight = (height: number) => {
  if (!Number.isFinite(height)) {
    return undefined;
  }

  return Math.max(1, Math.round(height));
};

const hasNonZeroPosition = (
  position: unknown,
): position is WindowPositionState =>
  typeof position === "object" &&
  position !== null &&
  "x" in position &&
  "y" in position &&
  typeof position.x === "number" &&
  typeof position.y === "number" &&
  (position.x !== 0 || position.y !== 0);

const inferLegacyDefinedPosition = (
  windowId: WindowId,
  windowState: unknown,
) => {
  if (typeof windowState !== "object" || windowState === null) {
    return false;
  }

  const position = (windowState as { position?: unknown }).position;

  if (windowId === "settings") {
    return hasNonZeroPosition(position);
  }

  return typeof position === "object" && position !== null;
};

export const migrateWindowsState = (
  persisted: unknown,
  version: number,
): WindowsState => {
  const state = persisted as Record<string, unknown>;

  if (version < 2) {
    if (state["chat-input"]) {
      state.command = state["chat-input"];
      delete state["chat-input"];
    }
    if (Array.isArray(state.windowFocusHistory)) {
      state.windowFocusHistory = (state.windowFocusHistory as string[]).map(
        (id) => (id === "chat-input" ? "command" : id),
      );
    }
    if (state.currentWindowFocus === "chat-input") {
      state.currentWindowFocus = "command";
    }
  }

  if (version < 3) {
    const settings = state.settings as Record<string, unknown> | undefined;
    state.settings = {
      ...settings,
      state: (settings?.state as Record<string, unknown> | undefined) ?? {},
    };
  }

  if (version < 4) {
    const windowIds: WindowId[] = [
      "app-error",
      "settings",
      "timers",
      "chat",
      "command",
      "online-players",
      "add-timer",
      "npc-detector",
      "notifications",
      "create-notification",
      "quick-access",
      "timer-settings-conflict",
      "catching-whitelist-warning",
      "backend-preferences-warning",
      "party-finder",
      "create-party-gathering",
    ];

    windowIds.forEach((windowId) => {
      const windowState = state[windowId];
      if (typeof windowState !== "object" || windowState === null) {
        return;
      }

      state[windowId] = {
        ...windowState,
        hasDefinedPosition: inferLegacyDefinedPosition(windowId, windowState),
      };
    });

    const settings = state.settings as Record<string, unknown> | undefined;
    state.settings = {
      ...settings,
      state: (settings?.state as Record<string, unknown> | undefined) ?? {},
    };
  }

  const addTimer = state["add-timer"] as Record<string, unknown> | undefined;
  if (addTimer && typeof addTimer === "object" && !("state" in addTimer)) {
    state["add-timer"] = {
      ...addTimer,
      state: {},
    };
  }

  const onlinePlayers = state["online-players"] as
    | Record<string, unknown>
    | undefined;
  if (onlinePlayers && typeof onlinePlayers === "object") {
    const { state: _, ...windowState } = onlinePlayers;
    state["online-players"] = windowState;
  }

  if (version < 9 && !state["event-mode"]) {
    state["event-mode"] = createDefaultEventModeWindow();
  }

  return state as unknown as WindowsState;
};

export const useWindowsStore = create<WindowsState>()(
  persist(
    (set, get) => ({
      "app-error": {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: {
          width: APP_ERROR_WINDOW_WIDTH,
          height: APP_ERROR_WINDOW_DEFAULT_HEIGHT,
        },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      settings: {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 640, height: 440 },
        opacity: DEFAULT_OPACITY,
        locked: false,
        state: {},
      },
      timers: {
        open: true,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: DEFAULT_SIZE,
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      chat: {
        open: true,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: DEFAULT_SIZE,
        opacity: DEFAULT_OPACITY,
        locked: false,
        autofocus: false,
      },
      command: {
        open: false,
        position: {
          x: Math.round((window.innerWidth - 242) / 2),
          y: Math.round((window.innerHeight - 240) / 2),
        },
        hasDefinedPosition: true,
        size: { width: 242, height: 240 },
        opacity: DEFAULT_OPACITY,
        locked: false,
        autofocus: false,
      },
      "online-players": {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 242, height: 240 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      "add-timer": {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 242, height: 300 },
        opacity: DEFAULT_OPACITY,
        locked: false,
        state: {},
      },
      "npc-detector": {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 300, height: 300 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      notifications: {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 360, height: 300 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      "create-notification": {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 242, height: 300 },
        opacity: DEFAULT_OPACITY,
        state: { npcs: [] },
        locked: false,
      },
      "quick-access": {
        open: true,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 250, height: 56 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      "timer-settings-conflict": {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 420, height: 320 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      "catching-whitelist-warning": {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 400, height: 240 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      "backend-preferences-warning": {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 430, height: 250 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      "party-finder": {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: DEFAULT_SIZE,
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      "create-party-gathering": {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 280, height: 220 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      "event-mode": createDefaultEventModeWindow(),
      currentWindowFocus: undefined,
      windowFocusHistory: [],
      setCurrentWindowFocus: (key: WindowId) =>
        set((state) => {
          const newHistory = [
            key,
            ...state.windowFocusHistory.filter((id) => id !== key),
          ];
          return {
            currentWindowFocus: key,
            windowFocusHistory: newHistory,
          };
        }),
      setOpen: <T = unknown>(key: WindowId, open: boolean, windowState?: T) => {
        return set((state) => {
          const newHistory = open
            ? [key, ...state.windowFocusHistory.filter((id) => id !== key)]
            : state.windowFocusHistory.filter((id) => id !== key);
          const currentWindow = state[key];
          const hasWindowState = "state" in currentWindow;

          const nextState =
            windowState !== undefined
              ? windowState
              : key === "settings" && !open
                ? {}
                : hasWindowState
                  ? currentWindow.state
                  : undefined;

          return {
            [key]:
              nextState === undefined
                ? { ...currentWindow, open }
                : { ...currentWindow, open, state: nextState },
            currentWindowFocus: open ? key : undefined,
            windowFocusHistory: newHistory,
          };
        });
      },
      setPosition: (key: WindowId, pos) =>
        set((state) => ({
          [key]: {
            ...state[key],
            position: pos,
            hasDefinedPosition: true,
          },
        })),
      setSize: (key: WindowId, size) =>
        set((state) => ({ [key]: { ...state[key], size } })),
      setMaxContentHeight: (key: WindowId, height: number) =>
        set((state) => {
          const nextMaxContentHeight = sanitizeMaxContentHeight(height);

          if (nextMaxContentHeight === undefined) {
            return state;
          }

          return {
            [key]: {
              ...state[key],
              maxContentHeight: nextMaxContentHeight,
            },
          };
        }),
      setOpacity: (key: WindowId, opacity: WindowOpacity) =>
        set((state) => ({ [key]: { ...state[key], opacity } })),
      setLocked: (key: WindowId, locked: boolean) =>
        set((state) => ({ [key]: { ...state[key], locked } })),
      setAutofocus: (key: WindowId, autofocus: boolean) =>
        set((state) => ({ [key]: { ...state[key], autofocus } })),
      setSettingsActiveTab: (activeTab) =>
        set((state) => ({
          settings: {
            ...state.settings,
            state: {
              ...state.settings.state,
              activeTab,
            },
          },
        })),
      toggleOpen: (key: WindowId, autofocus?: boolean) => {
        const curr = get()[key].open;
        set((state) => {
          const newHistory = !curr
            ? [key, ...state.windowFocusHistory.filter((id) => id !== key)]
            : state.windowFocusHistory.filter((id) => id !== key);
          return {
            [key]: {
              ...state[key],
              open: !curr,
              autofocus,
            },
            currentWindowFocus: !curr ? key : undefined,
            windowFocusHistory: newHistory,
          };
        });
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        settings: state.settings,
        timers: state.timers,
        chat: state.chat,
        command: state.command,
        "online-players": state["online-players"],
        "add-timer": state["add-timer"],
        "npc-detector": state["npc-detector"],
        notifications: state["notifications"],
        currentWindowFocus: state.currentWindowFocus,
        windowFocusHistory: state.windowFocusHistory,
        "create-notification": {
          size: state["create-notification"].size,
          position: state["create-notification"].position,
          opacity: state["create-notification"].opacity,
        },
        "quick-access": state["quick-access"],
        "timer-settings-conflict": state["timer-settings-conflict"],
        "catching-whitelist-warning": state["catching-whitelist-warning"],
        "backend-preferences-warning": state["backend-preferences-warning"],
        "party-finder": state["party-finder"],
        "create-party-gathering": state["create-party-gathering"],
        "event-mode": state["event-mode"],
      }),
      storage: createJSONStorage(() => localStorage),
      version: 9,
      migrate: migrateWindowsState,
    },
  ),
);
