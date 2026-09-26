import { Option, Schema } from "effect";
import { isObjectRecord } from "@lootlog/schema/records";
import {
  resolveSettingsPath,
  SETTINGS_DOMAIN_VALUES,
  SETTINGS_SUBSECTION_VALUES,
  LEGACY_SETTINGS_TAB_VALUES,
  type SettingsPath,
  type SettingsSubsectionValue,
  type SettingsTabValue,
} from "@/features/settings/constants/settings-tabs";
import {
  APP_ERROR_WINDOW_DEFAULT_HEIGHT,
  APP_ERROR_WINDOW_WIDTH,
} from "@/features/error-boundary/error-boundary.constants";
import { create } from "zustand";
import {
  persist,
  createJSONStorage,
  type StateStorage,
} from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";
import { looseStruct, optionalOrUndefined } from "@/lib/stored-value-schema";

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

type SettingsWindowState = {
  activeTab?: SettingsTabValue;
  activeSubsection?: SettingsSubsectionValue;
};

type WindowPayload = SettingsWindowState;

export type WindowId =
  | "extension-login"
  | "app-error"
  | "settings"
  | "timers"
  | "chat"
  | "command"
  | "online-players"
  | "npc-detector"
  | "notifications"
  | "quick-access"
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
  maxContentHeight?: number;
  /** Shrunk to its collapsed content; `size` keeps the expanded size. */
  collapsed?: boolean;
}

export type WindowFocusRequest = {
  windowId: WindowId;
  /** Receives focus back when the window closes; `null` returns it to the game. */
  returnFocusTo: HTMLElement | null;
};

const createFocusRequest = (windowId: WindowId): WindowFocusRequest => {
  const activeElement = document.activeElement;

  return {
    windowId,
    returnFocusTo:
      activeElement instanceof HTMLElement && activeElement !== document.body
        ? activeElement
        : null,
  };
};

interface WindowsState {
  "extension-login": WindowData;
  "app-error": WindowData;
  settings: WindowData & { state: SettingsWindowState };
  timers: WindowData;
  chat: WindowData;
  command: WindowData;
  "online-players": WindowData;
  "npc-detector": WindowData;
  notifications: WindowData;
  "quick-access": WindowData;
  "catching-whitelist-warning": WindowData;
  "backend-preferences-warning": WindowData;
  "party-finder": WindowData;
  "create-party-gathering": WindowData;
  currentWindowFocus?: WindowId;
  windowFocusHistory: WindowId[];
  /**
   * The window a player just opened on purpose, waiting for its frame to move
   * keyboard focus into it. Never persisted: a restored or automatically
   * opened window must not take focus from the game.
   */
  focusRequest?: WindowFocusRequest;
  setCurrentWindowFocus: (key: WindowId) => void;
  /** Opens or closes a window without moving keyboard focus. */
  setOpen: (window: WindowId, open: boolean, state?: WindowPayload) => void;
  /**
   * Opens a window in response to an explicit player action (a button, a
   * shortcut, a command) and asks its frame to move keyboard focus into it.
   * Focus returns to the previously focused element when the window closes.
   */
  openAndFocus: (window: WindowId, state?: WindowPayload) => void;
  clearFocusRequest: (window: WindowId) => void;
  setPosition: (window: WindowId, pos: WindowPositionState) => void;
  setSize: (window: WindowId, size: WindowSizeState) => void;
  setMaxContentHeight: (window: WindowId, height: number) => void;
  setOpacity: (window: WindowId, opacity: WindowOpacity) => void;
  setLocked: (window: WindowId, locked: boolean) => void;
  setCollapsed: (window: WindowId, collapsed: boolean) => void;
  /** A player action: opening this way also moves keyboard focus into the window. */
  toggleOpen: (window: WindowId) => void;
  setSettingsActiveTab: (activeTab?: SettingsTabValue) => void;
  /**
   * Restores every window's default geometry, opacity and lock while keeping
   * open state and window payloads, so the window the player is using stays
   * open and on the same page.
   */
  resetWindowLayout: () => void;
  setSettingsPath: (
    activeTab: SettingsTabValue,
    activeSubsection: SettingsSubsectionValue,
  ) => void;
}

const DEFAULT_OPACITY: WindowOpacity = 4;

/**
 * Stored until the player places a window. While `hasDefinedPosition` is false
 * the frame ignores it and shows the window at its viewport-relative default
 * (`resolveDefaultWindowPosition`), which the layout reset restores.
 */
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

const settingsTabSchema = Schema.Literals([
  ...SETTINGS_DOMAIN_VALUES,
  ...LEGACY_SETTINGS_TAB_VALUES,
]);

const isSettingsTab = Schema.is(settingsTabSchema);

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
  "npc-detector",
  "notifications",
  "quick-access",
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

const migrateSettingsTabToPath = (state: RawPersistedWindows): void => {
  const settings = isObjectRecord(state.settings) ? state.settings : {};
  const settingsState = isObjectRecord(settings.state) ? settings.state : {};

  const previousTab = isSettingsTab(settingsState.activeTab)
    ? settingsState.activeTab
    : undefined;

  // Version 12 mapped "appearance" to its chat subsection, which version 14
  // later moved into the chat domain; keep that historical destination.
  const nextPath: SettingsPath =
    previousTab === "appearance"
      ? { domain: "chat", subsection: "chat-appearance" }
      : resolveSettingsPath(previousTab);

  state.settings = {
    ...settings,
    state: {
      ...settingsState,
      activeTab: nextPath.domain,
      activeSubsection: nextPath.subsection,
    },
  };
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

const migrateRoutingSettingsPath = (state: RawPersistedWindows): void => {
  const settings = isObjectRecord(state.settings) ? state.settings : {};
  const settingsState = isObjectRecord(settings.state) ? settings.state : {};

  if (settingsState.activeSubsection !== "routing") return;

  state.settings = {
    ...settings,
    state: {
      ...settingsState,
      activeTab: "detector",
      activeSubsection: "detector",
    },
  };
};

/** Moves the retired appearance/interface page into general and catching into its own domain. */
const migrateGeneralSettingsPath = (state: RawPersistedWindows): void => {
  const settings = isObjectRecord(state.settings) ? state.settings : {};
  const settingsState = isObjectRecord(settings.state) ? settings.state : {};

  if (settingsState.activeSubsection === "interface") {
    state.settings = {
      ...settings,
      state: {
        ...settingsState,
        activeTab: "general",
        activeSubsection: "behavior",
      },
    };

    return;
  }

  if (settingsState.activeSubsection === "catching") {
    state.settings = {
      ...settings,
      state: {
        ...settingsState,
        activeTab: "catching",
        activeSubsection: "catching",
      },
    };
  }
};

const migrateMutesSettingsPath = (state: RawPersistedWindows): void => {
  const settings = isObjectRecord(state.settings) ? state.settings : {};
  const settingsState = isObjectRecord(settings.state) ? settings.state : {};

  if (settingsState.activeSubsection !== "notification-mutes") return;

  state.settings = {
    ...settings,
    state: {
      ...settingsState,
      activeTab: "mutes",
      activeSubsection: "muted-players",
    },
  };
};

/** Settings-page relocations, applied in order for persisted versions below `since`. */
const SETTINGS_PATH_MIGRATIONS: readonly [
  since: number,
  migrate: (state: RawPersistedWindows) => void,
][] = [
  [12, migrateSettingsTabToPath],
  [14, migrateChatSettingsPath],
  [16, migrateMutesSettingsPath],
  [17, migrateRoutingSettingsPath],
  [18, migrateGeneralSettingsPath],
];

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

  if (version < 13) delete state["event-mode"];

  if (version < 15) delete state["timer-settings-conflict"];

  // Manual timer creation moved into the timers window in version 19.
  if (version < 19) delete state["add-timer"];

  // The notification creation window was never rendered; version 20 drops it.
  if (version < 20) delete state["create-notification"];

  for (const [since, migrate] of SETTINGS_PATH_MIGRATIONS) {
    if (version < since) migrate(state);
  }

  return state;
};

const optionalNumber = optionalOrUndefined(Schema.Finite);

const optionalBoolean = optionalOrUndefined(Schema.Boolean);

const windowSchema = looseStruct({
  open: optionalBoolean,
  hasDefinedPosition: optionalBoolean,
  locked: optionalBoolean,
  opacity: optionalOrUndefined(Schema.Literals([1, 2, 3, 4, 5])),
  maxContentHeight: optionalNumber,
  collapsed: optionalBoolean,
  position: optionalOrUndefined(
    looseStruct({ x: optionalNumber, y: optionalNumber }),
  ),
  size: optionalOrUndefined(
    looseStruct({ width: optionalNumber, height: optionalNumber }),
  ),
});

const decodeWindow = Schema.decodeUnknownOption(windowSchema);

const parsePersistedWindow = (
  value: unknown,
  defaults: WindowData,
): WindowData => {
  const parsed = decodeWindow(value);

  if (Option.isNone(parsed)) return defaults;
  const data = parsed.value;

  return {
    ...defaults,
    ...data,
    open: data.open ?? defaults.open,
    hasDefinedPosition: data.hasDefinedPosition ?? defaults.hasDefinedPosition,
    locked: data.locked ?? defaults.locked,
    opacity: data.opacity ?? defaults.opacity,
    maxContentHeight: data.maxContentHeight ?? defaults.maxContentHeight,
    collapsed: data.collapsed ?? defaults.collapsed,
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

// A payload that is not an object throws, which leaves the store unhydrated.
const decodeSettingsPayload = Schema.decodeUnknownSync(
  looseStruct({
    activeTab: optionalOrUndefined(settingsTabSchema),
    activeSubsection: optionalOrUndefined(
      Schema.Literals(SETTINGS_SUBSECTION_VALUES),
    ),
  }),
);

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
    if (id === "settings") continue;
    merged[id] = parsePersistedWindow(raw[id], current[id]);
  }

  // Quick chat is summoned for one entry: a reload, including one that
  // restores an older payload with the console open, must not reopen it and
  // pull focus away from the game.
  merged.command = { ...merged.command, open: false };

  merged.settings = {
    ...parsePersistedWindow(raw.settings, current.settings),
    state: {
      ...current.settings.state,
      ...decodeSettingsPayload(readPersistedWindowPayload(raw.settings)),
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
        size: { width: 820, height: 560 },
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
      },
      command: {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 242, height: 240 },
        opacity: DEFAULT_OPACITY,
        locked: false,
      },
      "online-players": {
        open: false,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: 242, height: 240 },
        opacity: DEFAULT_OPACITY,
        locked: false,
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
      "quick-access": {
        open: true,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: { width: DEFAULT_QUICK_ACCESS_WIDTH, height: 56 },
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
      focusRequest: undefined,
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
        // Resolved outside `set`: a no-op call (detector or notification bursts
        // re-open an already focused window) must not run the persist write.
        const state = get();
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

        const nextFocusRequest =
          !open && state.focusRequest?.windowId === key
            ? undefined
            : state.focusRequest;

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
          state.windowFocusHistory === nextHistory &&
          state.focusRequest === nextFocusRequest
        ) {
          return;
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

        set({
          [key]: nextWindow,
          currentWindowFocus: nextCurrentWindowFocus,
          windowFocusHistory: nextHistory,
          focusRequest: nextFocusRequest,
        });
      },
      openAndFocus: (key, windowState) => {
        const focusRequest = createFocusRequest(key);
        get().setOpen(key, true, windowState);
        set({ focusRequest });
      },
      clearFocusRequest: (key) => {
        if (get().focusRequest?.windowId !== key) return;
        set({ focusRequest: undefined });
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
      setCollapsed: (key: WindowId, collapsed: boolean) =>
        set((state) =>
          (state[key].collapsed ?? false) === collapsed
            ? state
            : { [key]: { ...state[key], collapsed } },
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
      resetWindowLayout: () =>
        set((state) => {
          const defaults = useWindowsStore.getInitialState();

          const resetWindow = <T extends WindowData>(
            current: T,
            fallback: WindowData,
          ): T => ({
            ...current,
            position: fallback.position,
            hasDefinedPosition: fallback.hasDefinedPosition,
            size: fallback.size,
            opacity: fallback.opacity,
            locked: fallback.locked,
            maxContentHeight: undefined,
            collapsed: fallback.collapsed,
          });

          return {
            settings: resetWindow(state.settings, defaults.settings),
            timers: resetWindow(state.timers, defaults.timers),
            chat: resetWindow(state.chat, defaults.chat),
            command: resetWindow(state.command, defaults.command),
            "online-players": resetWindow(
              state["online-players"],
              defaults["online-players"],
            ),
            "npc-detector": resetWindow(
              state["npc-detector"],
              defaults["npc-detector"],
            ),
            notifications: resetWindow(
              state.notifications,
              defaults.notifications,
            ),
            "quick-access": resetWindow(
              state["quick-access"],
              defaults["quick-access"],
            ),
            "catching-whitelist-warning": resetWindow(
              state["catching-whitelist-warning"],
              defaults["catching-whitelist-warning"],
            ),
            "backend-preferences-warning": resetWindow(
              state["backend-preferences-warning"],
              defaults["backend-preferences-warning"],
            ),
            "party-finder": resetWindow(
              state["party-finder"],
              defaults["party-finder"],
            ),
            "create-party-gathering": resetWindow(
              state["create-party-gathering"],
              defaults["create-party-gathering"],
            ),
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
      toggleOpen: (key: WindowId) => {
        const curr = get()[key].open;
        const focusRequest = curr ? undefined : createFocusRequest(key);
        set((state) => {
          const newHistory = !curr
            ? [key, ...state.windowFocusHistory.filter((id) => id !== key)]
            : state.windowFocusHistory.filter((id) => id !== key);

          return {
            [key]: {
              ...state[key],
              open: !curr,
            },
            currentWindowFocus: !curr ? key : undefined,
            windowFocusHistory: newHistory,
            focusRequest:
              focusRequest ??
              (state.focusRequest?.windowId === key
                ? undefined
                : state.focusRequest),
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
          focusRequest: _focusRequest,
          "extension-login": _extensionLogin,
          "app-error": _appError,
          setCurrentWindowFocus: _setCurrentWindowFocus,
          setOpen: _setOpen,
          openAndFocus: _openAndFocus,
          clearFocusRequest: _clearFocusRequest,
          setPosition: _setPosition,
          setSize: _setSize,
          setMaxContentHeight: _setMaxContentHeight,
          setOpacity: _setOpacity,
          setLocked: _setLocked,
          setCollapsed: _setCollapsed,
          toggleOpen: _toggleOpen,
          setSettingsActiveTab: _setSettingsActiveTab,
          resetWindowLayout: _resetWindowLayout,
          setSettingsPath: _setSettingsPath,
          ...persisted
        } = state;

        return persisted;
      },
      storage: createJSONStorage(() =>
        createDeduplicatingStateStorage(localStorage),
      ),
      version: 20,
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
      size: { width, height },
    },
  });
};
