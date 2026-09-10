import { z } from "zod";
import { isObjectRecord } from "@lootlog/schema/records";
import {
  resolveSettingsPath,
  SETTINGS_DOMAIN_VALUES,
  SETTINGS_SUBSECTION_VALUES,
  LEGACY_SETTINGS_TAB_VALUES,
  type SettingsSubsectionValue,
  type SettingsTabValue,
} from "@/features/settings/constants/settings-tabs";
import {
  APP_ERROR_WINDOW_DEFAULT_HEIGHT,
  APP_ERROR_WINDOW_WIDTH,
} from "@/features/error-boundary/error-boundary.constants";
import type { GameNpc } from "@lootlog/margonem/npcs";
import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";

const STORAGE_KEY = storageKey("ll-windows-state");

export const createDeduplicatingStateStorage = (
  storage: Pick<Storage, "getItem" | "removeItem" | "setItem">,
): StateStorage => ({
  getItem: (key) => storage.getItem(key),
  removeItem: (key) => storage.removeItem(key),
  setItem: (key, value) => {
    if (storage.getItem(key) === value) {
      return;
    }

    storage.setItem(key, value);
  },
});

type CreateNotificationState = {
  npc?: GameNpc;
};

type SettingsWindowState = {
  activeTab?: SettingsTabValue;
  activeSubsection?: SettingsSubsectionValue;
};

type AddTimerWindowState = {
  guildId?: string;
};

type WindowPayload =
  | CreateNotificationState
  | SettingsWindowState
  | AddTimerWindowState;

export type WindowId =
  | "extension-login"
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
  | "create-party-gathering";

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
  "extension-login": WindowData;
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
  currentWindowFocus?: WindowId;
  windowFocusHistory: WindowId[];
  setCurrentWindowFocus: (key: WindowId) => void;
  setOpen: (window: WindowId, open: boolean, state?: WindowPayload) => void;
  setPosition: (window: WindowId, pos: WindowPositionState) => void;
  setSize: (window: WindowId, size: WindowSizeState) => void;
  setMaxContentHeight: (window: WindowId, height: number) => void;
  setOpacity: (window: WindowId, opacity: WindowOpacity) => void;
  setLocked: (window: WindowId, locked: boolean) => void;
  toggleOpen: (window: WindowId, autofocus?: boolean) => void;
  setAutofocus: (window: WindowId, autofocus: boolean) => void;
  setSettingsActiveTab: (activeTab?: SettingsTabValue) => void;
  setSettingsPath: (
    activeTab: SettingsTabValue,
    activeSubsection: SettingsSubsectionValue,
  ) => void;
}

const DEFAULT_OPACITY: WindowOpacity = 4;
const DEFAULT_POSITION: WindowPositionState = { x: 0, y: 0 };
const DEFAULT_QUICK_ACCESS_WIDTH = 250;
const DEFAULT_SIZE: WindowSizeState = { width: 242, height: 240 };

export const sanitizeMaxContentHeight = (height: number | undefined) => {
  if (height === undefined || !Number.isFinite(height)) {
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

type RawPersistedWindows = Record<string, unknown>;

const settingsTabSchema = z.enum([
  ...SETTINGS_DOMAIN_VALUES,
  ...LEGACY_SETTINGS_TAB_VALUES,
]);

const inferLegacyDefinedPosition = (
  windowId: WindowId,
  windowState: unknown,
) => {
  if (!isObjectRecord(windowState)) return false;
  const position = windowState.position;
  return windowId === "settings"
    ? hasNonZeroPosition(position)
    : isObjectRecord(position);
};

const migrateLegacyWindowEntries = (state: RawPersistedWindows): void => {
  const addTimer = state["add-timer"];
  if (isObjectRecord(addTimer) && !("state" in addTimer)) {
    state["add-timer"] = { ...addTimer, state: {} };
  }
  const onlinePlayers = state["online-players"];
  if (isObjectRecord(onlinePlayers)) {
    const { state: _, ...windowState } = onlinePlayers;
    state["online-players"] = windowState;
  }
};

const WINDOW_IDS: WindowId[] = [
  "extension-login",
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

const migrateLegacyCommand = (state: RawPersistedWindows): void => {
  if (state["chat-input"]) {
    state.command = state["chat-input"];
    delete state["chat-input"];
  }
  if (Array.isArray(state.windowFocusHistory)) {
    state.windowFocusHistory = state.windowFocusHistory.map((id) =>
      id === "chat-input" ? "command" : id,
    );
  }
  if (state.currentWindowFocus === "chat-input")
    state.currentWindowFocus = "command";
};

const migrateQuickAccessWidth = (state: RawPersistedWindows): void => {
  const quickAccess = state["quick-access"];
  if (isObjectRecord(quickAccess) && isObjectRecord(quickAccess.size)) {
    state["quick-access"] = {
      ...quickAccess,
      size: { ...quickAccess.size, width: DEFAULT_QUICK_ACCESS_WIDTH },
    };
  }
};

const migrateChatSettingsPath = (state: RawPersistedWindows): void => {
  const settings = isObjectRecord(state.settings) ? state.settings : {};
  const settingsState = isObjectRecord(settings.state) ? settings.state : {};
  if (
    settingsState.activeTab !== "appearance" ||
    settingsState.activeSubsection !== "chat"
  ) {
    return;
  }
  state.settings = {
    ...settings,
    state: {
      ...settingsState,
      activeTab: "chat",
      activeSubsection: "chat-appearance",
    },
  };
};

export const migrateWindowsState = (
  persisted: unknown,
  version: number,
): RawPersistedWindows => {
  const state = isObjectRecord(persisted) ? persisted : {};
  if (version < 2) migrateLegacyCommand(state);
  if (version < 3) {
    const settings = isObjectRecord(state.settings) ? state.settings : {};
    state.settings = { ...settings, state: settings.state ?? {} };
  }
  if (version < 4) {
    for (const windowId of WINDOW_IDS) {
      if (windowId === "extension-login") continue;
      const windowState = state[windowId];
      if (!isObjectRecord(windowState)) continue;
      state[windowId] = {
        ...windowState,
        hasDefinedPosition: inferLegacyDefinedPosition(windowId, windowState),
      };
    }
    const settings = isObjectRecord(state.settings) ? state.settings : {};
    state.settings = { ...settings, state: settings.state ?? {} };
  }
  migrateLegacyWindowEntries(state);
  if (version < 10) {
    state.currentWindowFocus = undefined;
    state.windowFocusHistory = [];
  }
  if (version < 11) migrateQuickAccessWidth(state);
  if (version < 12) {
    const settings = isObjectRecord(state.settings) ? state.settings : {};
    const settingsState = isObjectRecord(settings.state) ? settings.state : {};
    const previousTab = settingsTabSchema.safeParse(settingsState.activeTab);
    const nextPath = resolveSettingsPath(
      previousTab.success ? previousTab.data : undefined,
    );
    state.settings = {
      ...settings,
      state: {
        ...settingsState,
        activeTab: nextPath.domain,
        activeSubsection: nextPath.subsection,
      },
    };
  }
  if (version < 13) delete state["event-mode"];
  if (version < 14) migrateChatSettingsPath(state);
  return state;
};

const optionalNumber = z.number().optional().catch(undefined);
const optionalBoolean = z.boolean().optional().catch(undefined);
const windowSchema = z.looseObject({
  open: optionalBoolean,
  hasDefinedPosition: optionalBoolean,
  locked: optionalBoolean,
  opacity: z
    .union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ])
    .optional()
    .catch(undefined),
  autofocus: optionalBoolean,
  maxContentHeight: optionalNumber,
  position: z
    .looseObject({ x: optionalNumber, y: optionalNumber })
    .optional()
    .catch(undefined),
  size: z
    .looseObject({ width: optionalNumber, height: optionalNumber })
    .optional()
    .catch(undefined),
});

const parsePersistedWindow = (
  value: unknown,
  defaults: WindowData,
): WindowData => {
  const parsed = windowSchema.safeParse(value);
  if (!parsed.success) return defaults;
  const data = parsed.data;
  return {
    ...defaults,
    ...data,
    open: data.open ?? defaults.open,
    hasDefinedPosition: data.hasDefinedPosition ?? defaults.hasDefinedPosition,
    locked: data.locked ?? defaults.locked,
    opacity: data.opacity ?? defaults.opacity,
    autofocus: data.autofocus ?? defaults.autofocus,
    maxContentHeight: data.maxContentHeight ?? defaults.maxContentHeight,
    position: {
      ...defaults.position,
      ...data.position,
      x: data.position?.x ?? defaults.position.x,
      y: data.position?.y ?? defaults.position.y,
    },
    size: {
      ...defaults.size,
      ...data.size,
      width: data.size?.width ?? defaults.size.width,
      height: data.size?.height ?? defaults.size.height,
    },
  };
};

const settingsPayloadSchema = z.looseObject({
  activeTab: settingsTabSchema.optional().catch(undefined),
  activeSubsection: z
    .enum(SETTINGS_SUBSECTION_VALUES)
    .optional()
    .catch(undefined),
});
const addTimerPayloadSchema = z.looseObject({
  guildId: z.string().optional().catch(undefined),
});
const notificationPayloadSchema = z.looseObject({
  npc: z
    .looseObject({
      icon: z.string(),
      id: z.number(),
      tpl: z.number(),
      x: z.number(),
      y: z.number(),
      nick: z.string(),
      prof: z.string(),
      type: z.number(),
      wt: z.number(),
      lvl: z.number(),
      actions: optionalNumber,
      grp: optionalNumber,
      resp_rand: optionalNumber,
    })
    .optional()
    .catch(undefined),
});

const readPersistedWindowPayload = (value: unknown) =>
  isObjectRecord(value) && isObjectRecord(value.state) ? value.state : {};

const mergePersistedWindows = (
  persisted: unknown,
  current: WindowsState,
): WindowsState => {
  const raw = isObjectRecord(persisted) ? persisted : {};
  // Keep extension fields, but persisted names must never overwrite live actions.
  const merged = { ...raw, ...current };
  for (const id of WINDOW_IDS) {
    if (id === "settings" || id === "add-timer" || id === "create-notification")
      continue;
    merged[id] = parsePersistedWindow(raw[id], current[id]);
  }
  merged.settings = {
    ...parsePersistedWindow(raw.settings, current.settings),
    state: {
      ...current.settings.state,
      ...settingsPayloadSchema.parse(readPersistedWindowPayload(raw.settings)),
    },
  };
  merged["add-timer"] = {
    ...parsePersistedWindow(raw["add-timer"], current["add-timer"]),
    state: {
      ...current["add-timer"].state,
      ...addTimerPayloadSchema.parse(
        readPersistedWindowPayload(raw["add-timer"]),
      ),
    },
  };
  merged["create-notification"] = {
    ...parsePersistedWindow(
      raw["create-notification"],
      current["create-notification"],
    ),
    state: {
      ...current["create-notification"].state,
      ...notificationPayloadSchema.parse(
        readPersistedWindowPayload(raw["create-notification"]),
      ),
    },
  };
  return merged;
};

export const useWindowsStore = create<WindowsState>()(
  persist<WindowsState, [], [], RawPersistedWindows>(
    (set, get) => ({
      "extension-login": {
        open: true,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 360, height: 180 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
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
        size: { width: 760, height: 520 },
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
        size: { width: DEFAULT_QUICK_ACCESS_WIDTH, height: 56 },
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
      currentWindowFocus: undefined,
      windowFocusHistory: [],
      setCurrentWindowFocus: (key: WindowId) =>
        set((state) => {
          if (
            state.currentWindowFocus === key &&
            state.windowFocusHistory[0] === key
          ) {
            return state;
          }

          const newHistory = [
            key,
            ...state.windowFocusHistory.filter((id) => id !== key),
          ];
          return {
            currentWindowFocus: key,
            windowFocusHistory: newHistory,
          };
        }),
      setOpen: (key, open, windowState) => {
        return set((state) => {
          const currentWindow = state[key];
          const hasWindowState = "state" in currentWindow;
          let nextState = hasWindowState ? currentWindow.state : undefined;

          if (windowState !== undefined) {
            nextState = windowState;
          }

          let nextHistory = state.windowFocusHistory;

          if (open) {
            const isAlreadyFirst = state.windowFocusHistory[0] === key;

            if (!isAlreadyFirst) {
              nextHistory = [
                key,
                ...state.windowFocusHistory.filter((id) => id !== key),
              ];
            }
          } else if (state.windowFocusHistory.includes(key)) {
            nextHistory = state.windowFocusHistory.filter((id) => id !== key);
          }

          let nextCurrentWindowFocus = state.currentWindowFocus;

          if (open) {
            nextCurrentWindowFocus = key;
          } else if (state.currentWindowFocus === key) {
            nextCurrentWindowFocus = undefined;
          }

          const hasSameWindowState =
            nextState === undefined ||
            (hasWindowState && Object.is(currentWindow.state, nextState));

          if (
            currentWindow.open === open &&
            hasSameWindowState &&
            state.currentWindowFocus === nextCurrentWindowFocus &&
            state.windowFocusHistory === nextHistory
          ) {
            return state;
          }

          let nextWindow: WindowsState[WindowId] = {
            ...currentWindow,
            open,
          };

          if (nextState !== undefined) {
            nextWindow = {
              ...currentWindow,
              open,
              state: nextState,
            };
          }

          return {
            [key]: nextWindow,
            currentWindowFocus: nextCurrentWindowFocus,
            windowFocusHistory: nextHistory,
          };
        });
      },
      setPosition: (key: WindowId, pos) =>
        set((state) => {
          const currentWindow = state[key];
          if (
            currentWindow.hasDefinedPosition &&
            currentWindow.position.x === pos.x &&
            currentWindow.position.y === pos.y
          ) {
            return state;
          }

          return {
            [key]: {
              ...currentWindow,
              position: pos,
              hasDefinedPosition: true,
            },
          };
        }),
      setSize: (key: WindowId, size) =>
        set((state) => {
          const currentSize = state[key].size;

          if (
            currentSize.width === size.width &&
            currentSize.height === size.height
          ) {
            return state;
          }

          return { [key]: { ...state[key], size } };
        }),
      setMaxContentHeight: (key: WindowId, height: number) =>
        set((state) => {
          const nextMaxContentHeight = sanitizeMaxContentHeight(height);

          if (nextMaxContentHeight === undefined) {
            return state;
          }

          if (state[key].maxContentHeight === nextMaxContentHeight) {
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
        set((state) =>
          state[key].opacity === opacity
            ? state
            : { [key]: { ...state[key], opacity } },
        ),
      setLocked: (key: WindowId, locked: boolean) =>
        set((state) =>
          state[key].locked === locked
            ? state
            : { [key]: { ...state[key], locked } },
        ),
      setAutofocus: (key: WindowId, autofocus: boolean) =>
        set((state) =>
          state[key].autofocus === autofocus
            ? state
            : { [key]: { ...state[key], autofocus } },
        ),
      setSettingsActiveTab: (activeTab) =>
        set((state) => {
          const nextPath = resolveSettingsPath(activeTab);
          if (
            state.settings.state.activeTab === nextPath.domain &&
            state.settings.state.activeSubsection === nextPath.subsection
          ) {
            return state;
          }

          return {
            settings: {
              ...state.settings,
              state: {
                ...state.settings.state,
                activeTab: nextPath.domain,
                activeSubsection: nextPath.subsection,
              },
            },
          };
        }),
      setSettingsPath: (activeTab, activeSubsection) =>
        set((state) => ({
          settings: {
            ...state.settings,
            state: {
              ...state.settings.state,
              activeTab,
              activeSubsection,
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
      partialize: (state) => {
        const {
          currentWindowFocus: _focus,
          windowFocusHistory: _history,
          "extension-login": _extensionLogin,
          "app-error": _appError,
          setCurrentWindowFocus: _setCurrentWindowFocus,
          setOpen: _setOpen,
          setPosition: _setPosition,
          setSize: _setSize,
          setMaxContentHeight: _setMaxContentHeight,
          setOpacity: _setOpacity,
          setLocked: _setLocked,
          toggleOpen: _toggleOpen,
          setAutofocus: _setAutofocus,
          setSettingsActiveTab: _setSettingsActiveTab,
          setSettingsPath: _setSettingsPath,
          ...persisted
        } = state;
        const {
          open: _open,
          hasDefinedPosition: _hasDefinedPosition,
          locked: _locked,
          autofocus: _autofocus,
          maxContentHeight: _maxContentHeight,
          state: _notificationState,
          ...notificationGeometry
        } = state["create-notification"];
        return { ...persisted, "create-notification": notificationGeometry };
      },
      storage: createJSONStorage(() =>
        createDeduplicatingStateStorage(localStorage),
      ),
      version: 14,
      migrate: migrateWindowsState,
      merge: mergePersistedWindows,
    },
  ),
);

// This prompt belongs to the current runtime, never to persisted player preferences.
export const resetExtensionLoginWindow = () => {
  const width = Math.min(
    360,
    window.visualViewport?.width ?? window.innerWidth,
  );
  const height = Math.min(
    180,
    window.visualViewport?.height ?? window.innerHeight,
  );
  useWindowsStore.setState({
    "extension-login": {
      ...useWindowsStore.getInitialState()["extension-login"],
      position: {
        x: Math.max(
          0,
          ((window.visualViewport?.width ?? window.innerWidth) - width) / 2,
        ),
        y: Math.max(
          0,
          ((window.visualViewport?.height ?? window.innerHeight) - height) / 2,
        ),
      },
      size: { width, height },
      hasDefinedPosition: true,
    },
  });
};
