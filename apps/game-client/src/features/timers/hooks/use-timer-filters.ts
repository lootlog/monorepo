import { useEffect } from "react";
import type { TimersFilters } from "@lootlog/schema/timer-settings";
import {
  getCharacterFilterKey,
  getCharacterFilterScopeKey,
} from "@/lib/character-filter-scope";
import { useGameStore } from "@/store/game.store";
import { DEFAULT_TIMERS_FILTERS, useTimersStore } from "@/store/timers.store";

export const useTimerFilters = (
  settingsKey: string | undefined,
  world: string,
) => {
  const scopeKey = useGameStore((state) =>
    getCharacterFilterScopeKey(state.game, world),
  );

  const legacyTimersFilters = useTimersStore(
    (state) => state.legacyTimersFilters,
  );

  const initializeCharacterFilters = useTimersStore(
    (state) => state.initializeCharacterFilters,
  );

  const setTimersFilters = useTimersStore((state) => state.setTimersFilters);

  const filters = useTimersStore((state) =>
    scopeKey && settingsKey
      ? (state.timersFilters[getCharacterFilterKey(scopeKey, settingsKey)] ??
        state.legacyTimersFilters[settingsKey] ??
        DEFAULT_TIMERS_FILTERS)
      : DEFAULT_TIMERS_FILTERS,
  );

  useEffect(() => {
    if (scopeKey) initializeCharacterFilters(scopeKey);
  }, [scopeKey, legacyTimersFilters, initializeCharacterFilters]);

  const setFilters = (next: TimersFilters) => {
    if (scopeKey && settingsKey) setTimersFilters(scopeKey, settingsKey, next);
  };

  return { filters, setFilters };
};
