import { vi } from "vitest";
import { TIMERS_MODERN_COMFORTABLE_PRESET } from "@lootlog/schema/timer-settings";
import type { TimersWindowModel } from "@/features/timers/hooks/use-timers-window-model";

export type TimersWindowModelOverrides = {
  layout?: TimersWindowModel["layout"];
  scope?: Partial<TimersWindowModel["scope"]>;
  list?: Partial<TimersWindowModel["list"]>;
  async?: Partial<TimersWindowModel["async"]>;
  toolbar?: Partial<TimersWindowModel["toolbar"]>;
  appearance?: Partial<
    Omit<TimersWindowModel["appearance"], "displayConfig" | "colors" | "modern">
  > & {
    displayConfig?: Partial<TimersWindowModel["appearance"]["displayConfig"]>;
    colors?: Partial<TimersWindowModel["appearance"]["colors"]>;
    modern?: Partial<TimersWindowModel["appearance"]["modern"]>;
  };
  access?: Partial<TimersWindowModel["access"]>;
  actions?: Partial<TimersWindowModel["actions"]>;
};

/** A resolved window model for layout tests; every action is a spy. */
export const createTimersWindowModelFixture = (
  overrides: TimersWindowModelOverrides = {},
): TimersWindowModel => ({
  layout: overrides.layout ?? "modern",
  scope: {
    guildId: "guild-1",
    settingsKey: "guild-1",
    world: "pandora",
    isGrouping: false,
    allowWorldSelection: false,
    ...overrides.scope,
  },
  list: {
    timers: [],
    hiddenTimerNames: new Set(),
    hiddenTimers: [],
    pinnedTimers: [],
    alwaysVisibleExpiredTimers: {},
    colorStatistics: [],
    areFiltersActive: false,
    ...overrides.list,
  },
  async: {
    initialLoading: false,
    initialError: null,
    refreshing: false,
    refreshError: false,
    retry: vi.fn(),
    ...overrides.async,
  },
  toolbar: {
    filtersEnabled: true,
    toggleFilters: vi.fn(),
    colorFiltersEnabled: false,
    toggleColorFilters: vi.fn(),
    sortOrder: "asc",
    setSortOrder: vi.fn(),
    showHidden: false,
    setShowHidden: vi.fn(),
    ...overrides.toolbar,
  },
  appearance: {
    compactView: false,
    countdownMode: "max",
    ...overrides.appearance,
    displayConfig: {
      showType: true,
      showLevel: false,
      fontSize: 11,
      minColumnWidth: 120,
      singleTimerDisplayMode: "row",
      ...overrides.appearance?.displayConfig,
    },
    colors: {
      timersColors: {},
      customColors: {},
      defaultColorNames: {},
      overriddenDefaultColors: {},
      hiddenDefaultColors: [],
      ...overrides.appearance?.colors,
    },
    modern: {
      ...TIMERS_MODERN_COMFORTABLE_PRESET,
      ...overrides.appearance?.modern,
    },
  },
  access: {
    guildIds: ["guild-1"],
    guildNamesById: { "guild-1": "Alpha" },
    policiesByGuildId: {},
    isPending: false,
    ...overrides.access,
  },
  actions: {
    openAddTimer: vi.fn(),
    resetFilters: vi.fn(),
    close: vi.fn(),
    ...overrides.actions,
  },
});
