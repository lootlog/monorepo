import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CustomTimerColor } from "@lootlog/schema/timer-settings";
import { getUsersControllerGetUserPreferencesQueryKey } from "@lootlog/client/main";
import { settingsPatchQueue } from "@/features/settings/persistence/settings-patch-client";
import { queryClient } from "@/lib/query-client";
import { CHAT_APPEARANCE_READABLE_PRESET } from "@lootlog/schema/chat-appearance";

// The queue is the real boundary; only its enqueue side is observed so no
// request leaves the test.
const enqueue = vi
  .spyOn(settingsPatchQueue, "enqueue")
  .mockImplementation(() => {});

const operations = () => enqueue.mock.calls.map(([patch]) => patch.operation);

const patchesFor = (domain: "timers" | "appearance") =>
  operations().filter((operation) => operation.domain === domain);

const userScope = { type: "USER", id: "user" } as const;

import { NpcType } from "@/api/npcs.api";
import { TIMERS_STORAGE_KEY, useTimersStore } from "./timers.store";

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
    generalConfig: {
      removeTimerAfterMs: 30000,
      timersGrouping: false,
      timersUnderBag: false,
      countdownMode: "max",
      compactView: false,
    },
    displayConfig: {
      legacyAppearance: false,
      showType: true,
      showLevel: false,
      fontSize: 11,
      minColumnWidth: 140,
      singleTimerDisplayMode: "row",
    },
  });
};

afterEach(() => {
  vi.useRealTimers();
});

describe("timers.store", () => {
  beforeEach(() => {
    enqueue.mockClear();
    queryClient.clear();
    queryClient.setQueryData(getUsersControllerGetUserPreferencesQueryKey(), {
      userId: "user",
      guildsOrder: [],
      hiddenGuildIds: [],
      theme: "default",
      chatAppearance: CHAT_APPEARANCE_READABLE_PRESET,
      mutes: { players: [], npcs: [] },
    });
    vi.useFakeTimers();
    window.localStorage.removeItem(TIMERS_STORAGE_KEY);
    resetTimersStore();
  });

  it("defaults old stored appearance to modern even after legacy was enabled", async () => {
    expect(
      useTimersStore.getInitialState().displayConfig.legacyAppearance,
    ).toBe(false);
    useTimersStore.getState().setDisplayConfig({
      ...useTimersStore.getState().displayConfig,
      legacyAppearance: true,
    });
    localStorage.setItem(
      TIMERS_STORAGE_KEY,
      JSON.stringify({
        version: 6,
        state: { displayConfig: { fontSize: 14 } },
      }),
    );
    await useTimersStore.persist.rehydrate();
    expect(useTimersStore.getState().displayConfig).toMatchObject({
      legacyAppearance: false,
      fontSize: 14,
    });
  });

  it.each([true, false])(
    "persists and syncs legacy appearance %s without changing colors",
    async (legacyAppearance) => {
      const colors = { Tanroth: "red" };
      useTimersStore.setState({ timersColors: colors });

      const displayConfig = {
        ...useTimersStore.getState().displayConfig,
        legacyAppearance,
      };

      useTimersStore.getState().setDisplayConfig(displayConfig);
      expect(patchesFor("appearance").at(-1)?.set).toEqual({
        timers: { displayConfig },
      });
      expect(useTimersStore.getState().timersColors).toEqual(colors);
      await useTimersStore.persist.rehydrate();
      expect(useTimersStore.getState().displayConfig).toEqual(displayConfig);
      expect(useTimersStore.getState().timersColors).toEqual(colors);
    },
  );

  it("deduplicates hidden and pinned timers", () => {
    const store = useTimersStore.getState();

    store.hideTimer("guild-1", "timer-1");
    vi.advanceTimersByTime(500);
    store.hideTimer("guild-1", "timer-1");
    vi.advanceTimersByTime(500);
    store.pinTimer("guild-1", "timer-7");
    vi.advanceTimersByTime(500);
    store.pinTimer("guild-1", "timer-7");
    vi.advanceTimersByTime(500);

    expect(useTimersStore.getState().hiddenTimers).toEqual({
      "guild-1": ["timer-1"],
    });
    expect(useTimersStore.getState().pinnedTimers).toEqual({
      "guild-1": ["timer-7"],
    });
    expect(operations().at(-1)).toEqual({
      domain: "timers",
      scope: { type: "GUILD", id: "guild-1" },
      set: { pinnedTimers: ["timer-7"] },
      unset: [],
    });
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
    vi.advanceTimersByTime(500);
    store.unpinTimer("guild-1", "timer-8");
    vi.advanceTimersByTime(500);

    expect(useTimersStore.getState().hiddenTimers["guild-1"]).toEqual([
      "timer-2",
    ]);
    expect(useTimersStore.getState().pinnedTimers["guild-1"]).toEqual([
      "timer-7",
    ]);
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
      legacyAppearance: true,
      showType: false,
      showLevel: true,
      fontSize: 13,
      minColumnWidth: 180,
      singleTimerDisplayMode: "column" as const,
    };

    const store = useTimersStore.getState();
    store.setGeneralConfig(nextGeneralConfig);
    vi.advanceTimersByTime(500);
    store.setDisplayConfig(nextDisplayConfig);
    vi.advanceTimersByTime(500);
    store.setTimersSortOrder("desc");
    vi.advanceTimersByTime(500);
    store.setTimersFilters("global", {
      minLvl: 50,
      maxLvl: 150,
      selectedNpcTypes: [NpcType.HERO],
      selectedColors: ["custom-1"],
    });
    vi.advanceTimersByTime(500);

    expect(useTimersStore.getState()).toMatchObject({
      generalConfig: nextGeneralConfig,
      displayConfig: nextDisplayConfig,
      timersSortOrder: "desc",
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
    expect(patchesFor("timers").map((patch) => patch.set)).toEqual([
      { generalConfig: nextGeneralConfig },
      { timersSortOrder: "desc" },
    ]);
    expect(patchesFor("appearance").map((patch) => patch.set)).toEqual([
      { timers: { displayConfig: nextDisplayConfig } },
    ]);
  });

  it("updates always visible expired timers and syncs global settings", () => {
    const store = useTimersStore.getState();

    store.showExpiredTimerAlways("experimental", "123:test-boss");
    vi.advanceTimersByTime(500);
    store.showExpiredTimerAlways("experimental", "123:test-boss");
    vi.advanceTimersByTime(500);
    store.hideExpiredTimerAlways("experimental", "123:test-boss");
    vi.advanceTimersByTime(500);

    expect(useTimersStore.getState().alwaysVisibleExpiredTimers).toEqual({
      experimental: [],
    });
    expect(patchesFor("timers").map((patch) => patch.set)).toEqual([
      { alwaysVisibleExpiredTimers: { experimental: ["123:test-boss"] } },
      { alwaysVisibleExpiredTimers: { experimental: ["123:test-boss"] } },
      { alwaysVisibleExpiredTimers: { experimental: [] } },
    ]);
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
    vi.advanceTimersByTime(500);

    expect(useTimersStore.getState().customColors).toEqual({});
    expect(useTimersStore.getState().timersColors).toEqual({
      Tanroth: undefined,
      Heros: "default-1",
    });
    expect(operations().at(-1)).toEqual({
      domain: "appearance",
      scope: userScope,
      set: {
        timers: { customColors: {}, timersColors: { Heros: "default-1" } },
      },
      unset: ["timers.timersColors.Tanroth"],
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
    vi.advanceTimersByTime(500);

    expect(useTimersStore.getState().hiddenDefaultColors).toEqual([
      "default-1",
    ]);
    expect(useTimersStore.getState().timersColors).toEqual({
      Tanroth: undefined,
      Heros: "custom-1",
    });

    useTimersStore.getState().restoreDefaultColor("default-1");
    vi.advanceTimersByTime(500);

    expect(useTimersStore.getState().hiddenDefaultColors).toEqual([]);
    expect(useTimersStore.getState().defaultColorNames).toEqual({});
    expect(useTimersStore.getState().overriddenDefaultColors).toEqual({});
    expect(operations().at(-1)).toEqual({
      domain: "appearance",
      scope: userScope,
      set: {
        timers: {
          hiddenDefaultColors: [],
          overriddenDefaultColors: {},
          defaultColorNames: {},
        },
      },
      unset: [],
    });
  });

  it("resets a visible default color without hiding it", () => {
    useTimersStore.setState({
      hiddenDefaultColors: [],
      defaultColorNames: { red: "Alarm" },
      overriddenDefaultColors: {
        red: {
          borderColor: "#111111",
          backgroundColor: "#22222233",
        },
      },
    });

    useTimersStore.getState().resetDefaultColor("red");
    vi.advanceTimersByTime(500);

    expect(useTimersStore.getState().hiddenDefaultColors).toEqual([]);
    expect(useTimersStore.getState().defaultColorNames).toEqual({});
    expect(useTimersStore.getState().overriddenDefaultColors).toEqual({});
    expect(operations().at(-1)).toEqual({
      domain: "appearance",
      scope: userScope,
      set: { timers: { overriddenDefaultColors: {}, defaultColorNames: {} } },
      unset: [],
    });
  });

  it("unsets colour map entries removed while other entries remain", () => {
    useTimersStore.setState({
      customColors: {
        "custom-1": {
          id: "custom-1",
          name: "Bosses",
          borderColor: "#111111",
          backgroundColor: "#22222233",
        },
        "custom-2": {
          id: "custom-2",
          name: "Titans",
          borderColor: "#333333",
          backgroundColor: "#44444433",
        },
      },
      defaultColorNames: { red: "Alarm", green: "Safe" },
      overriddenDefaultColors: {
        red: { borderColor: "#111111", backgroundColor: "#22222233" },
        green: { borderColor: "#333333", backgroundColor: "#44444433" },
      },
    });

    useTimersStore.getState().resetDefaultColor("red");
    useTimersStore.getState().deleteCustomColor("custom-1");
    vi.advanceTimersByTime(500);

    expect(
      patchesFor("appearance").map(({ set, unset }) => ({ set, unset })),
    ).toEqual([
      {
        set: {
          timers: {
            overriddenDefaultColors: {
              green: { borderColor: "#333333", backgroundColor: "#44444433" },
            },
            defaultColorNames: { green: "Safe" },
          },
        },
        unset: [
          "timers.defaultColorNames.red",
          "timers.overriddenDefaultColors.red",
        ],
      },
      {
        set: {
          timers: {
            customColors: {
              "custom-2": {
                id: "custom-2",
                name: "Titans",
                borderColor: "#333333",
                backgroundColor: "#44444433",
              },
            },
            timersColors: {},
          },
        },
        unset: ["timers.customColors.custom-1"],
      },
    ]);
  });

  it("does not rewrite stored settings while typing a search", () => {
    const setItem = vi.spyOn(window.localStorage, "setItem");
    const store = useTimersStore.getState();

    const timerWrites = () =>
      setItem.mock.calls.filter(([key]) => key === TIMERS_STORAGE_KEY);

    store.setTimerFiltersSearchText("t");
    setItem.mockClear();
    store.setTimerFiltersSearchText("ta");
    store.setTimerFiltersSearchText("tan");

    expect(timerWrites()).toHaveLength(0);

    store.setTimersSortOrder("desc");

    expect(timerWrites()).toHaveLength(1);
    expect(
      JSON.parse(window.localStorage.getItem(TIMERS_STORAGE_KEY) ?? "null")
        .state.timersSortOrder,
    ).toBe("desc");
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
    vi.advanceTimersByTime(500);
    store.setTimerFiltersSearchText("tanroth");
    vi.advanceTimersByTime(500);

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
