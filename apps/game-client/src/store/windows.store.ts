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
import { persist, createJSONStorage } from "zustand/middleware";
import { storageKey } from "@/lib/storage-key";
import { createChangedOnlyStorage } from "./changed-only-storage";
import { looseStruct, optionalOrUndefined } from "@lootlog/schema/stored-value";

const STORAGE_KEY = storageKey("ll-windows-state");

type SettingsWindowState = {
  activeTab?: SettingsTabValue;
  activeSubsection?: SettingsSubsectionValue;
};

type WindowPayload = SettingsWindowState;

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

const withFocusedWindow = (
  state: { windowFocusHistory: WindowId[] },
  windowId: WindowId,
) => [windowId, ...state.windowFocusHistory.filter((id) => id !== windowId)];

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

type SettingsWindowData = WindowData & { state: SettingsWindowState };

type WindowEntries = Record<Exclude<WindowId, "settings">, WindowData> & {
  settings: SettingsWindowData;
};

interface WindowsState extends WindowEntries {
  /** Windows by recency of focus, most recent first; drives stacking. */
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

/**
 * Every window the store knows, in persisted key order, with the open state
 * and size it starts with. All other window fields share one default.
 */
const WINDOW_DEFAULTS = {
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
} as const satisfies Record<string, Pick<WindowData, "open" | "size">>;

export type WindowId = keyof typeof WINDOW_DEFAULTS;

// SAFETY: the keys of WINDOW_DEFAULTS are exactly WindowId.
const WINDOW_IDS = Object.keys(WINDOW_DEFAULTS) as WindowId[];

/**
 * Windows owned by the current runtime: they are never persisted and the
 * layout reset leaves them alone.
 */
const RUNTIME_WINDOW_IDS = new Set<WindowId>(["extension-login", "app-error"]);

/**
 * Store fields that live only in memory. Actions are dropped separately so the
 * persisted state matches what hydration reads back from storage.
 */
const TRANSIENT_FIELDS = new Set<string>([
  "windowFocusHistory",
  "focusRequest",
  ...RUNTIME_WINDOW_IDS,
]);

const createDefaultWindows = (): WindowEntries => {
  // SAFETY: built with one entry for every WindowId.
  const windows = Object.fromEntries(
    WINDOW_IDS.map((id) => [
      id,
      {
        open: WINDOW_DEFAULTS[id].open,
        position: DEFAULT_POSITION,
        hasDefinedPosition: false,
        size: WINDOW_DEFAULTS[id].size,
        opacity: DEFAULT_OPACITY,
        locked: false,
      } satisfies WindowData,
    ]),
  ) as Record<WindowId, WindowData>;

  return { ...windows, settings: { ...windows.settings, state: {} } };
};

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

const migrateLegacyCommand = (state: RawPersistedWindows): void => {
  if (state["chat-input"]) {
    state.command = state["chat-input"];
    delete state["chat-input"];
  }
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

const readSettingsState = (state: RawPersistedWindows) => {
  const settings = isObjectRecord(state.settings) ? state.settings : {};
  const settingsState = isObjectRecord(settings.state) ? settings.state : {};

  return { settings, settingsState };
};

const writeSettingsPath = (
  state: RawPersistedWindows,
  activeTab: string,
  activeSubsection: string,
): void => {
  const { settings, settingsState } = readSettingsState(state);

  state.settings = {
    ...settings,
    state: { ...settingsState, activeTab, activeSubsection },
  };
};

const migrateSettingsTabToPath = (state: RawPersistedWindows): void => {
  const { activeTab } = readSettingsState(state).settingsState;
  const previousTab = isSettingsTab(activeTab) ? activeTab : undefined;

  // Version 12 mapped "appearance" to its chat subsection, which version 14
  // later moved into the chat domain; keep that historical destination.
  const nextPath: SettingsPath =
    previousTab === "appearance"
      ? { domain: "chat", subsection: "chat-appearance" }
      : resolveSettingsPath(previousTab);

  writeSettingsPath(state, nextPath.domain, nextPath.subsection);
};

const migrateChatSettingsPath = (state: RawPersistedWindows): void => {
  const { settingsState } = readSettingsState(state);

  if (
    settingsState.activeTab === "appearance" &&
    settingsState.activeSubsection === "chat"
  ) {
    writeSettingsPath(state, "chat", "chat-appearance");
  }
};

const migrateRoutingSettingsPath = (state: RawPersistedWindows): void => {
  if (readSettingsState(state).settingsState.activeSubsection === "routing") {
    writeSettingsPath(state, "detector", "detector");
  }
};

/** Moves the retired appearance/interface page into general and catching into its own domain. */
const migrateGeneralSettingsPath = (state: RawPersistedWindows): void => {
  const { activeSubsection } = readSettingsState(state).settingsState;

  if (activeSubsection === "interface") {
    writeSettingsPath(state, "general", "behavior");
  } else if (activeSubsection === "catching") {
    writeSettingsPath(state, "catching", "catching");
  }
};

const migrateMutesSettingsPath = (state: RawPersistedWindows): void => {
  const { activeSubsection } = readSettingsState(state).settingsState;

  if (activeSubsection === "notification-mutes") {
    writeSettingsPath(state, "mutes", "muted-players");
  }
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

  // Focus became transient in version 10.
  if (version < 10) {
    delete state.currentWindowFocus;
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
      ...createDefaultWindows(),
      windowFocusHistory: [],
      focusRequest: undefined,
      setCurrentWindowFocus: (key: WindowId) =>
        set((state) =>
          state.windowFocusHistory[0] === key
            ? state
            : { windowFocusHistory: withFocusedWindow(state, key) },
        ),
      setOpen: (key, open, windowState) => {
        // Resolved outside `set`: a no-op call (detector or notification bursts
        // re-open an already focused window) must not run the persist write.
        const state = get();
        const currentWindow = state[key];

        let nextHistory = state.windowFocusHistory;

        if (open) {
          if (nextHistory[0] !== key) {
            nextHistory = withFocusedWindow(state, key);
          }
        } else if (nextHistory.includes(key)) {
          nextHistory = nextHistory.filter((id) => id !== key);
        }

        const nextFocusRequest =
          !open && state.focusRequest?.windowId === key
            ? undefined
            : state.focusRequest;

        const hasSameWindowState =
          windowState === undefined ||
          ("state" in currentWindow &&
            Object.is(currentWindow.state, windowState));

        if (
          currentWindow.open === open &&
          hasSameWindowState &&
          state.windowFocusHistory === nextHistory &&
          state.focusRequest === nextFocusRequest
        ) {
          return;
        }

        set({
          [key]:
            windowState === undefined
              ? { ...currentWindow, open }
              : { ...currentWindow, open, state: windowState },
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

          return Object.fromEntries(
            WINDOW_IDS.filter((id) => !RUNTIME_WINDOW_IDS.has(id)).map((id) => [
              id,
              resetWindow(state[id], defaults[id]),
            ]),
          );
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
        if (get()[key].open) get().setOpen(key, false);
        else get().openAndFocus(key);
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) =>
        Object.fromEntries(
          Object.entries(state).filter(
            ([key, value]) =>
              !TRANSIENT_FIELDS.has(key) && !(value instanceof Function),
          ),
        ),
      storage: createChangedOnlyStorage(createJSONStorage(() => localStorage)),
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
