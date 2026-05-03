import { beforeEach, describe, expect, it, vi } from "vitest";

const mockDebouncedSyncGlobalSettings = vi.fn();
const mockDebouncedSyncGuildSettings = vi.fn();

vi.mock("./timer-settings-sync", () => ({
  debouncedSyncGlobalSettings: (...args: unknown[]) =>
    mockDebouncedSyncGlobalSettings(...args),
  debouncedSyncGuildSettings: (...args: unknown[]) =>
    mockDebouncedSyncGuildSettings(...args),
}));

import { NpcType } from "@/api/npcs.api";
import {
  TIMERS_STORAGE_KEY,
  useTimersStore,
  type CustomTimerColor,
} from "./timers.store";

const resetTimersStore = () => {
  useTimersStore.setState({
    updatedAt: undefined,
    hiddenTimers: {},
    pinnedTimers: {},
    alwaysVisibleExpiredTimers: {},
    timersColors: {},
    customColors: {},
    defaultColorNames: {},
    overriddenDefaultColors: {},
    hiddenDefaultColors: [],
    timersFilters: {},
    timerFiltersEnabled: false,
    colorFiltersEnabled: false,
    timerFiltersSearchText: "",
    timersSortOrder: "asc",
    syncEnabled: true,
    generalConfig: {
      removeTimerAfterMs: 30000,
      timersGrouping: false,
      timersUnderBag: false,
      countdownMode: "max",
      compactView: false,
    },
    displayConfig: {
      showType: true,
      showLevel: false,
      fontSize: 11,
      minColumnWidth: 120,
      singleTimerDisplayMode: "row",
    },
  });
};

describe("timers.store", () => {
  beforeEach(() => {
    mockDebouncedSyncGlobalSettings.mockReset();
    mockDebouncedSyncGuildSettings.mockReset();
    window.localStorage.removeItem(TIMERS_STORAGE_KEY);
    resetTimersStore();
  });

  it("deduplicates hidden and pinned timers and syncs guild settings", () => {
    const store = useTimersStore.getState();

    store.hideTimer("guild-1", "timer-1");
    store.hideTimer("guild-1", "timer-1");
    store.pinTimer("guild-1", "timer-7");
    store.pinTimer("guild-1", "timer-7");

    expect(useTimersStore.getState().hiddenTimers).toEqual({
      "guild-1": ["timer-1"],
    });
    expect(useTimersStore.getState().pinnedTimers).toEqual({
      "guild-1": ["timer-7"],
    });
    expect(mockDebouncedSyncGuildSettings).toHaveBeenNthCalledWith(
      1,
      "guild-1",
      {
        hiddenTimers: ["timer-1"],
      },
    );
    expect(mockDebouncedSyncGuildSettings).toHaveBeenNthCalledWith(
      2,
      "guild-1",
      {
        hiddenTimers: ["timer-1"],
      },
    );
    expect(mockDebouncedSyncGuildSettings).toHaveBeenNthCalledWith(
      3,
      "guild-1",
      {
        pinnedTimers: ["timer-7"],
      },
    );
    expect(mockDebouncedSyncGuildSettings).toHaveBeenNthCalledWith(
      4,
      "guild-1",
      {
        pinnedTimers: ["timer-7"],
      },
    );
  });

  it("reveals and unpins timers", () => {
    useTimersStore.setState({
      hiddenTimers: {
        "guild-1": ["timer-1", "timer-2"],
      },
      pinnedTimers: {
        "guild-1": ["timer-7", "timer-8"],
      },
    });

    const store = useTimersStore.getState();
    store.revealTimer("guild-1", "timer-1");
    store.unpinTimer("guild-1", "timer-8");

    expect(useTimersStore.getState().hiddenTimers["guild-1"]).toEqual([
      "timer-2",
    ]);
    expect(useTimersStore.getState().pinnedTimers["guild-1"]).toEqual([
      "timer-7",
    ]);
    expect(mockDebouncedSyncGuildSettings).toHaveBeenNthCalledWith(
      1,
      "guild-1",
      {
        hiddenTimers: ["timer-2"],
      },
    );
    expect(mockDebouncedSyncGuildSettings).toHaveBeenNthCalledWith(
      2,
      "guild-1",
      {
        pinnedTimers: ["timer-7"],
      },
    );
  });

  it("updates global config and filter preferences with sync side effects", () => {
    const nextGeneralConfig = {
      removeTimerAfterMs: 45000,
      timersGrouping: true,
      timersUnderBag: true,
      countdownMode: "min" as const,
      compactView: true,
    };
    const nextDisplayConfig = {
      showType: false,
      showLevel: true,
      fontSize: 13,
      minColumnWidth: 180,
      singleTimerDisplayMode: "column" as const,
    };

    const store = useTimersStore.getState();
    store.setGeneralConfig(nextGeneralConfig);
    store.setDisplayConfig(nextDisplayConfig);
    store.setTimersSortOrder("desc");
    store.setSyncEnabled(false);
    store.setTimersFilters("global", {
      minLvl: 50,
      maxLvl: 150,
      selectedNpcTypes: [NpcType.HERO],
      selectedColors: ["custom-1"],
    });

    expect(useTimersStore.getState()).toMatchObject({
      generalConfig: nextGeneralConfig,
      displayConfig: nextDisplayConfig,
      timersSortOrder: "desc",
      syncEnabled: false,
      timersFilters: {
        global: {
          minLvl: 50,
          maxLvl: 150,
          selectedNpcTypes: [NpcType.HERO],
          selectedColors: ["custom-1"],
        },
      },
    });
    expect(useTimersStore.getState().updatedAt).toEqual(expect.any(Number));
    expect(mockDebouncedSyncGlobalSettings).toHaveBeenCalledWith({
      generalConfig: nextGeneralConfig,
    });
    expect(mockDebouncedSyncGlobalSettings).toHaveBeenCalledWith({
      displayConfig: nextDisplayConfig,
    });
    expect(mockDebouncedSyncGlobalSettings).toHaveBeenCalledWith({
      timersSortOrder: "desc",
    });
    expect(mockDebouncedSyncGlobalSettings).toHaveBeenCalledWith({
      syncEnabled: false,
    });
  });

  it("updates always visible expired timers and syncs global settings", () => {
    const store = useTimersStore.getState();

    store.showExpiredTimerAlways("experimental", "123:test-boss");
    store.showExpiredTimerAlways("experimental", "123:test-boss");
    store.hideExpiredTimerAlways("experimental", "123:test-boss");

    expect(useTimersStore.getState().alwaysVisibleExpiredTimers).toEqual({
      experimental: [],
    });
    expect(mockDebouncedSyncGlobalSettings).toHaveBeenNthCalledWith(1, {
      alwaysVisibleExpiredTimers: {
        experimental: ["123:test-boss"],
      },
    });
    expect(mockDebouncedSyncGlobalSettings).toHaveBeenNthCalledWith(2, {
      alwaysVisibleExpiredTimers: {
        experimental: ["123:test-boss"],
      },
    });
    expect(mockDebouncedSyncGlobalSettings).toHaveBeenNthCalledWith(3, {
      alwaysVisibleExpiredTimers: {
        experimental: [],
      },
    });
  });

  it("deletes custom colors and clears matching timer assignments", () => {
    const customColor: CustomTimerColor = {
      id: "custom-1",
      name: "Custom red",
      borderColor: "#f00",
      backgroundColor: "#fee",
    };

    useTimersStore.setState({
      customColors: {
        "custom-1": customColor,
      },
      timersColors: {
        Tanroth: "custom-1",
        Heros: "default-1",
      },
    });

    useTimersStore.getState().deleteCustomColor("custom-1");

    expect(useTimersStore.getState().customColors).toEqual({});
    expect(useTimersStore.getState().timersColors).toEqual({
      Tanroth: undefined,
      Heros: "default-1",
    });
    expect(mockDebouncedSyncGlobalSettings).toHaveBeenCalledWith({
      customColors: {},
      timersColors: {
        Tanroth: undefined,
        Heros: "default-1",
      },
    });
  });

  it("hides default colors and restores them together with metadata cleanup", () => {
    useTimersStore.setState({
      timersColors: {
        Tanroth: "default-1",
        Heros: "custom-1",
      },
      hiddenDefaultColors: [],
      defaultColorNames: {
        "default-1": "Bosses",
      },
      overriddenDefaultColors: {
        "default-1": {
          borderColor: "#111",
          backgroundColor: "#222",
        },
      },
    });

    useTimersStore.getState().deleteDefaultColor("default-1");

    expect(useTimersStore.getState().hiddenDefaultColors).toEqual([
      "default-1",
    ]);
    expect(useTimersStore.getState().timersColors).toEqual({
      Tanroth: undefined,
      Heros: "custom-1",
    });

    useTimersStore.getState().restoreDefaultColor("default-1");

    expect(useTimersStore.getState().hiddenDefaultColors).toEqual([]);
    expect(useTimersStore.getState().defaultColorNames).toEqual({});
    expect(useTimersStore.getState().overriddenDefaultColors).toEqual({});
    expect(mockDebouncedSyncGlobalSettings).toHaveBeenLastCalledWith({
      hiddenDefaultColors: [],
      overriddenDefaultColors: {},
      defaultColorNames: {},
    });
  });

  it("persists only the partialized timer state", () => {
    const store = useTimersStore.getState();
    store.setGeneralConfig({
      removeTimerAfterMs: 60000,
      timersGrouping: true,
      timersUnderBag: false,
      countdownMode: "max",
      compactView: true,
    });
    store.setTimerFiltersSearchText("tanroth");

    const persistedState = JSON.parse(
      window.localStorage.getItem(TIMERS_STORAGE_KEY) ?? "null",
    );

    expect(persistedState.version).toBe(6);
    expect(persistedState.state.generalConfig).toEqual({
      removeTimerAfterMs: 60000,
      timersGrouping: true,
      timersUnderBag: false,
      countdownMode: "max",
      compactView: true,
    });
    expect(persistedState.state.timerFiltersSearchText).toBeUndefined();
    expect(persistedState.state.setGeneralConfig).toBeUndefined();
  });
});
