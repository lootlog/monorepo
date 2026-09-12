import { z } from "zod";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { TimersFilters } from "@lootlog/schema/timer-settings";
import { NpcType } from "@/api/npcs.api";
import { storageKey } from "@/lib/storage-key";
import {
  decodeLegacyTimerSnapshot,
  readLegacyTimerSnapshot,
  timersFiltersSchema,
} from "./settings/legacy-timer-snapshot";

export const TIMER_FILTERS_STORAGE_KEY = storageKey("ll-timers-filters");

export const DEFAULT_TIMERS_FILTERS: TimersFilters = {
  minLvl: 0,
  maxLvl: 300,
  selectedNpcTypes: [
    NpcType.ELITE3,
    NpcType.ELITE2,
    NpcType.HERO,
    NpcType.TITAN,
  ],
  selectedColors: [],
};

export const createDefaultTimersFilters = (): TimersFilters => ({
  ...DEFAULT_TIMERS_FILTERS,
  selectedNpcTypes: [...DEFAULT_TIMERS_FILTERS.selectedNpcTypes],
  selectedColors: [...DEFAULT_TIMERS_FILTERS.selectedColors],
});

type TimersFiltersByKey = Record<string, TimersFilters>;

interface TimerFiltersState {
  /** Filters per settings key (organization id or `global`); persisted per browser. */
  timersFilters: TimersFiltersByKey;
  /** Search text; lives for the session only. */
  searchText: string;
  setTimersFilters: (settingsKey: string, filters: TimersFilters) => void;
  setSearchText: (text: string) => void;
  resetFilters: (settingsKey: string) => void;
}

const persistedFilters = z.object({
  timersFilters: z.record(z.string(), timersFiltersSchema).catch({}),
});

/**
 * Filters saved by the store that held every timer preference before the
 * settings documents took over. The legacy key stays untouched because the
 * one-time settings import still reads it.
 */
const readLegacyFilters = (): TimersFiltersByKey =>
  decodeLegacyTimerSnapshot(readLegacyTimerSnapshot()).timersFilters ?? {};

export const useTimerFiltersStore = create<TimerFiltersState>()(
  persist(
    (set) => ({
      timersFilters: {},
      searchText: "",
      setTimersFilters: (settingsKey, filters) =>
        set((state) => ({
          timersFilters: { ...state.timersFilters, [settingsKey]: filters },
        })),
      setSearchText: (searchText) => set({ searchText }),
      resetFilters: (settingsKey) =>
        set((state) => ({
          searchText: "",
          timersFilters: {
            ...state.timersFilters,
            [settingsKey]: createDefaultTimersFilters(),
          },
        })),
    }),
    {
      name: TIMER_FILTERS_STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ timersFilters }) => ({ timersFilters }),
      merge: (persistedState, currentState) => {
        const persisted = persistedFilters.safeParse(persistedState);

        const timersFilters =
          persisted.success &&
          Object.keys(persisted.data.timersFilters).length > 0
            ? persisted.data.timersFilters
            : readLegacyFilters();

        return { ...currentState, timersFilters };
      },
    },
  ),
);
