import { afterEach, describe, expect, it } from "vitest";
import { NpcType } from "@/api/npcs.api";
import { LEGACY_TIMERS_STORAGE_KEY } from "./settings/legacy-timer-snapshot";
import {
  DEFAULT_TIMERS_FILTERS,
  TIMER_FILTERS_STORAGE_KEY,
  useTimerFiltersStore,
} from "./timer-filters.store";

const legacyFilters = {
  "guild-1": {
    minLvl: 10,
    maxLvl: 200,
    selectedNpcTypes: [NpcType.HERO],
    selectedColors: ["red"],
  },
};

const rehydrate = () => useTimerFiltersStore.persist.rehydrate();

afterEach(() => {
  localStorage.removeItem(TIMER_FILTERS_STORAGE_KEY);
  localStorage.removeItem(LEGACY_TIMERS_STORAGE_KEY);
  useTimerFiltersStore.setState({ timersFilters: {}, searchText: "" });
});

describe("timer filters store", () => {
  it("seeds saved filters from the legacy timers store without touching it", async () => {
    const legacy = JSON.stringify({
      state: {
        timersFilters: legacyFilters,
        hiddenTimers: { "guild-1": ["x"] },
      },
      version: 6,
    });

    localStorage.setItem(LEGACY_TIMERS_STORAGE_KEY, legacy);

    await rehydrate();

    expect(useTimerFiltersStore.getState().timersFilters).toEqual(
      legacyFilters,
    );
    expect(localStorage.getItem(LEGACY_TIMERS_STORAGE_KEY)).toBe(legacy);
  });

  it("prefers its own saved filters and falls back to defaults on a corrupt legacy value", async () => {
    localStorage.setItem(LEGACY_TIMERS_STORAGE_KEY, "{not json");
    await rehydrate();
    expect(useTimerFiltersStore.getState().timersFilters).toEqual({});

    useTimerFiltersStore.getState().setTimersFilters("guild-2", {
      ...DEFAULT_TIMERS_FILTERS,
      minLvl: 42,
    });
    useTimerFiltersStore.getState().setSearchText("draft");
    localStorage.setItem(
      LEGACY_TIMERS_STORAGE_KEY,
      JSON.stringify({ state: { timersFilters: legacyFilters }, version: 6 }),
    );

    await rehydrate();

    expect(
      useTimerFiltersStore.getState().timersFilters["guild-2"]?.minLvl,
    ).toBe(42);
    expect(
      JSON.parse(localStorage.getItem(TIMER_FILTERS_STORAGE_KEY) ?? "{}").state,
    ).toEqual({ timersFilters: useTimerFiltersStore.getState().timersFilters });
  });
});
