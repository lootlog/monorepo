import { beforeEach, describe, expect, it, vi } from "vitest";
import { storageKey } from "@/lib/storage-key";
import {
  createDeduplicatingStateStorage,
  migrateWindowsState,
  useWindowsStore,
} from "./windows.store";

describe("windows store", () => {
  beforeEach(() => {
    useWindowsStore.setState(useWindowsStore.getInitialState(), true);
    localStorage.clear();
  });

  it("uses the new settings default size", () => {
    expect(useWindowsStore.getState().settings.size).toEqual({
      width: 760,
      height: 520,
    });
  });

  it("does not publish when an open focused window is opened again", () => {
    useWindowsStore.setState((state) => ({
      notifications: {
        ...state.notifications,
        open: true,
      },
      currentWindowFocus: "notifications",
      windowFocusHistory: ["notifications", "chat"],
    }));
    const listener = vi.fn();
    const unsubscribe = useWindowsStore.subscribe(listener);
    const stateBefore = useWindowsStore.getState();

    useWindowsStore.getState().setOpen("notifications", true);

    expect(useWindowsStore.getState()).toBe(stateBefore);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("does not persist when an open focused window is opened again", () => {
    useWindowsStore.setState((state) => ({
      notifications: {
        ...state.notifications,
        open: true,
      },
      currentWindowFocus: "notifications",
      windowFocusHistory: ["notifications", "chat"],
    }));
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");

    useWindowsStore.getState().setOpen("notifications", true);

    expect(setItemSpy).not.toHaveBeenCalled();
    setItemSpy.mockRestore();
  });

  it("does not publish when a window size is unchanged", () => {
    const currentSize = useWindowsStore.getState().notifications.size;
    const listener = vi.fn();
    const unsubscribe = useWindowsStore.subscribe(listener);
    const stateBefore = useWindowsStore.getState();

    useWindowsStore.getState().setSize("notifications", { ...currentSize });

    expect(useWindowsStore.getState()).toBe(stateBefore);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("does not publish unchanged focus, position, opacity, lock, or autofocus", () => {
    useWindowsStore.getState().setCurrentWindowFocus("chat");
    useWindowsStore
      .getState()
      .setPosition("chat", useWindowsStore.getState().chat.position);
    const currentWindow = useWindowsStore.getState().chat;
    const listener = vi.fn();
    const unsubscribe = useWindowsStore.subscribe(listener);
    const stateBefore = useWindowsStore.getState();

    useWindowsStore.getState().setCurrentWindowFocus("chat");
    useWindowsStore
      .getState()
      .setPosition("chat", { ...currentWindow.position });
    useWindowsStore.getState().setOpacity("chat", currentWindow.opacity);
    useWindowsStore.getState().setLocked("chat", currentWindow.locked);
    useWindowsStore
      .getState()
      .setAutofocus("chat", currentWindow.autofocus ?? false);

    expect(useWindowsStore.getState()).toBe(stateBefore);
    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });

  it("does not persist current focus or focus history", () => {
    useWindowsStore.getState().setOpen("notifications", true);

    const serializedState = localStorage.getItem(
      storageKey("ll-windows-state"),
    );
    const persisted = JSON.parse(serializedState ?? "{}") as {
      state?: Record<string, unknown>;
    };

    expect(persisted.state).toBeDefined();
    expect(persisted.state).not.toHaveProperty("currentWindowFocus");
    expect(persisted.state).not.toHaveProperty("windowFocusHistory");
  });

  it("preserves the active settings tab while closing and reopening", () => {
    useWindowsStore.setState((state) => ({
      settings: {
        ...state.settings,
        open: true,
        state: { activeTab: "notifications" },
      },
    }));

    useWindowsStore.getState().setOpen("settings", false);

    expect(useWindowsStore.getState().settings.state.activeTab).toBe(
      "notifications",
    );

    useWindowsStore.getState().setOpen("settings", true);

    expect(useWindowsStore.getState().settings.state.activeTab).toBe(
      "notifications",
    );
  });

  it("opens a legacy destination at its mapped domain and subsection", () => {
    useWindowsStore.getState().setSettingsActiveTab("npc-detector");

    expect(useWindowsStore.getState().settings.state).toEqual({
      activeTab: "game-data",
      activeSubsection: "detector",
    });
  });
});

describe("createDeduplicatingStateStorage", () => {
  it("does not write a serialized state that is already persisted", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      removeItem: vi.fn((key: string) => values.delete(key)),
      setItem: vi.fn((key: string, value: string) => {
        values.set(key, value);
      }),
    };
    const deduplicatedStorage = createDeduplicatingStateStorage(storage);

    deduplicatedStorage.setItem("windows", "same-state");
    deduplicatedStorage.setItem("windows", "same-state");

    expect(storage.setItem).toHaveBeenCalledOnce();
  });
});

describe("migrateWindowsState", () => {
  it("maps a legacy tab to its domain without changing saved geometry", () => {
    const migrated = migrateWindowsState(
      {
        settings: {
          open: true,
          position: { x: 18, y: 24 },
          hasDefinedPosition: true,
          size: { width: 640, height: 470 },
          opacity: 4,
          locked: false,
          state: { activeTab: "npc-detector" },
        },
        windowFocusHistory: [],
      },
      11,
    );

    expect(migrated.settings.size).toEqual({ width: 640, height: 470 });
    expect(migrated.settings.state).toEqual({
      activeTab: "game-data",
      activeSubsection: "detector",
    });
  });

  it("resets only the legacy automatic quick access width", () => {
    const migrated = migrateWindowsState(
      {
        "quick-access": {
          open: true,
          position: { x: 30, y: 40 },
          hasDefinedPosition: true,
          size: { width: 412, height: 88 },
          opacity: 2,
          locked: true,
        },
        windowFocusHistory: [],
      },
      10,
    );

    expect(migrated["quick-access"]).toEqual({
      open: true,
      position: { x: 30, y: 40 },
      hasDefinedPosition: true,
      size: { width: 250, height: 88 },
      opacity: 2,
      locked: true,
    });
  });

  it("drops legacy focus state while preserving persisted window geometry", () => {
    const migrated = migrateWindowsState(
      {
        notifications: {
          open: true,
          position: { x: 30, y: 40 },
          hasDefinedPosition: true,
          size: { width: 360, height: 300 },
          opacity: 4,
          locked: false,
        },
        currentWindowFocus: "notifications",
        windowFocusHistory: ["notifications", "chat"],
      },
      9,
    );

    expect(migrated.notifications.position).toEqual({ x: 30, y: 40 });
    expect(migrated.currentWindowFocus).toBeUndefined();
    expect(migrated.windowFocusHistory).toEqual([]);
  });

  it("treats legacy settings position 0,0 as undefined", () => {
    const migrated = migrateWindowsState(
      {
        settings: {
          open: true,
          position: { x: 0, y: 0 },
          size: { width: 640, height: 440 },
          opacity: 4,
          locked: false,
        },
        windowFocusHistory: [],
      },
      3,
    );

    expect(migrated.settings.hasDefinedPosition).toBe(false);
    expect(migrated.settings.state).toEqual({
      activeTab: "general",
      activeSubsection: "behavior",
    });
  });

  it("keeps legacy non-zero settings position as defined", () => {
    const migrated = migrateWindowsState(
      {
        settings: {
          open: true,
          position: { x: 24, y: 48 },
          size: { width: 640, height: 440 },
          opacity: 4,
          locked: false,
        },
        windowFocusHistory: [],
      },
      3,
    );

    expect(migrated.settings.hasDefinedPosition).toBe(true);
    expect(migrated.settings.position).toEqual({ x: 24, y: 48 });
  });

  it("keeps max content height for notifications and npc detector", () => {
    const migrated = migrateWindowsState(
      {
        notifications: {
          open: true,
          position: { x: 0, y: 0 },
          hasDefinedPosition: false,
          size: { width: 360, height: 300 },
          opacity: 4,
          locked: false,
          maxContentHeight: 160,
        },
        "npc-detector": {
          open: true,
          position: { x: 0, y: 0 },
          hasDefinedPosition: false,
          size: { width: 300, height: 300 },
          opacity: 4,
          locked: false,
          maxContentHeight: 220,
        },
        windowFocusHistory: [],
      },
      5,
    );

    expect(migrated.notifications.maxContentHeight).toBe(160);
    expect(migrated["npc-detector"].maxContentHeight).toBe(220);
  });

  it("adds missing add timer window state for persisted windows", () => {
    const migrated = migrateWindowsState(
      {
        "add-timer": {
          open: false,
          position: { x: 0, y: 0 },
          hasDefinedPosition: false,
          size: { width: 242, height: 300 },
          opacity: 4,
          locked: false,
        },
        windowFocusHistory: [],
      },
      6,
    );

    expect(migrated["add-timer"].state).toEqual({});
  });

  it("removes old online players feature state from persisted windows", () => {
    const migrated = migrateWindowsState(
      {
        "online-players": {
          open: true,
          position: { x: 50, y: 60 },
          hasDefinedPosition: true,
          size: { width: 280, height: 340 },
          opacity: 2,
          locked: true,
          state: {
            viewMode: "members",
            filtersVisible: false,
            filtersByGuildId: {
              "guild-1": {
                minLvl: 100,
                maxLvl: 200,
                selectedProfession: "invalid",
              },
            },
          },
        },
        windowFocusHistory: [],
      },
      7,
    );

    expect(migrated["online-players"]).toEqual({
      open: true,
      position: { x: 50, y: 60 },
      hasDefinedPosition: true,
      size: { width: 280, height: 340 },
      opacity: 2,
      locked: true,
    });
  });

  it("keeps online players window settings without feature state", () => {
    const migrated = migrateWindowsState(
      {
        chat: {
          open: true,
          position: { x: 10, y: 20 },
          hasDefinedPosition: true,
          size: { width: 320, height: 260 },
          opacity: 3,
          locked: true,
        },
        notifications: {
          open: false,
          position: { x: 30, y: 40 },
          hasDefinedPosition: true,
          size: { width: 360, height: 300 },
          opacity: 4,
          locked: false,
          maxContentHeight: 180,
        },
        "online-players": {
          open: true,
          position: { x: 50, y: 60 },
          hasDefinedPosition: true,
          size: { width: 280, height: 340 },
          opacity: 2,
          locked: false,
        },
        currentWindowFocus: "online-players",
        windowFocusHistory: ["online-players", "chat"],
      },
      6,
    );

    expect(migrated.chat).toEqual({
      open: true,
      position: { x: 10, y: 20 },
      hasDefinedPosition: true,
      size: { width: 320, height: 260 },
      opacity: 3,
      locked: true,
    });
    expect(migrated.notifications).toEqual({
      open: false,
      position: { x: 30, y: 40 },
      hasDefinedPosition: true,
      size: { width: 360, height: 300 },
      opacity: 4,
      locked: false,
      maxContentHeight: 180,
    });
    expect(migrated["online-players"]).toEqual({
      open: true,
      position: { x: 50, y: 60 },
      hasDefinedPosition: true,
      size: { width: 280, height: 340 },
      opacity: 2,
      locked: false,
    });
    expect(migrated.currentWindowFocus).toBeUndefined();
    expect(migrated.windowFocusHistory).toEqual([]);
  });

  it("removes the retired Event Mode window from persisted state", () => {
    const migrated = migrateWindowsState(
      {
        chat: {
          open: true,
          position: { x: 10, y: 20 },
          hasDefinedPosition: true,
          size: { width: 320, height: 260 },
          opacity: 3,
          locked: true,
        },
        "event-mode": {
          open: true,
          position: { x: 30, y: 40 },
          hasDefinedPosition: true,
          size: { width: 290, height: 132 },
          opacity: 4,
          locked: false,
        },
        windowFocusHistory: ["chat"],
      },
      12,
    );

    expect(migrated).not.toHaveProperty("event-mode");
    expect(migrated.chat.position).toEqual({ x: 10, y: 20 });
  });
});
