import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type {
  CustomTimerColor,
  TimersDisplayConfig,
} from "@lootlog/schema/timer-settings";
import type { Timer } from "@/api/timers.api";
import { useTimers } from "@/hooks/api/use-timers";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import { DEFAULT_TIMERS_FILTERS, useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";
import type { TimerColorStatistic } from "@/features/timers/model/timer-list-projection";
import type { OverriddenTimerColor } from "@/features/timers/model/timer-colors";
import type { TimerWithTimeLeft } from "@/features/timers/model/timer-time";
import {
  resolveTimersAsyncState,
  type TimersAsyncState,
} from "@/features/timers/model/timers-async-state";
import {
  resolveTimersScope,
  type TimersScope,
} from "@/features/timers/model/timers-scope";
import {
  useTimerAccessPolicies,
  type TimerAccess,
} from "./use-timer-access-policies";
import { useTimerListProjection } from "./use-timer-list-projection";

const EMPTY_TIMERS: Timer[] = [];

export type TimersSurfaceKind = "window" | "under-bag";

export type TimersToolbarModel = {
  filtersEnabled: boolean;
  toggleFilters: () => void;
  colorFiltersEnabled: boolean;
  toggleColorFilters: () => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  showHidden: boolean;
  setShowHidden: (show: boolean) => void;
};

export type TimersColorPreferences = {
  timersColors: Record<string, string | undefined>;
  customColors: Record<string, CustomTimerColor>;
  defaultColorNames: Record<string, string>;
  overriddenDefaultColors: Record<string, OverriddenTimerColor>;
  hiddenDefaultColors: string[];
};

export type TimersWindowModel = {
  scope: TimersScope;
  list: {
    timers: TimerWithTimeLeft[];
    hiddenTimerNames: ReadonlySet<string>;
    hiddenTimers: string[];
    colorStatistics: TimerColorStatistic[];
    areFiltersActive: boolean;
  };
  async: TimersAsyncState & { retry: () => void };
  toolbar: TimersToolbarModel;
  appearance: {
    displayConfig: TimersDisplayConfig;
    compactView: boolean;
    countdownMode: "min" | "max";
    colors: TimersColorPreferences;
  };
  access: TimerAccess;
  actions: {
    openAddTimer: () => void;
    resetFilters: () => void;
    close: () => void;
  };
};

const getTimerGuildIds = (timers: TimerWithTimeLeft[]) => {
  const guildIds = new Set<string>();

  for (const timer of timers) {
    guildIds.add(timer.guildId);

    for (const entry of timer.mergedGuildIds ?? []) guildIds.add(entry.guildId);
  }

  return [...guildIds];
};

/**
 * Everything a timers surface needs, resolved once per surface: scope, the
 * projected list, async state, toolbar state, appearance preferences, access
 * policies and actions. Layouts render this model and own no data of their own.
 */
export const useTimersWindowModel = (
  surface: TimersSurfaceKind,
  isOpen: boolean,
): TimersWindowModel => {
  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );

  const gameWorld = useGameStore((state) => state.game?.world ?? "unknown");
  const setOpen = useWindowsStore((state) => state.setOpen);

  const { worldByGuildId, allowWorldSelection, guildIdByCharId } =
    useSettingsStore(
      useShallow((state) => ({
        worldByGuildId: state.worldByGuildId,
        allowWorldSelection: state.allowWorldSelection ?? false,
        guildIdByCharId: state.guildIdByCharId,
      })),
    );

  const store = useTimersStore(
    useShallow((state) => ({
      hiddenTimers: state.hiddenTimers,
      pinnedTimers: state.pinnedTimers,
      generalConfig: state.generalConfig,
      timerFiltersEnabled: state.timerFiltersEnabled ?? false,
      toggleTimerFiltersEnabled: state.toggleTimerFiltersEnabled,
      colorFiltersEnabled: state.colorFiltersEnabled ?? false,
      toggleColorFiltersEnabled: state.toggleColorFiltersEnabled,
      timerFiltersSearchText: state.timerFiltersSearchText ?? "",
      setTimerFiltersSearchText: state.setTimerFiltersSearchText,
      timersSortOrder: state.timersSortOrder ?? "asc",
      setTimersSortOrder: state.setTimersSortOrder,
      timersFilters: state.timersFilters,
      setTimersFilters: state.setTimersFilters,
      displayConfig: state.displayConfig,
      timersColors: state.timersColors,
      customColors: state.customColors,
      defaultColorNames: state.defaultColorNames,
      overriddenDefaultColors: state.overriddenDefaultColors,
      hiddenDefaultColors: state.hiddenDefaultColors,
      alwaysVisibleExpiredTimers: state.alwaysVisibleExpiredTimers,
    })),
  );

  const scope = resolveTimersScope({
    characterId,
    guildIdByCharId,
    worldByGuildId,
    allowWorldSelection,
    gameWorld,
    isGrouping: store.generalConfig.timersGrouping,
  });

  const timersQuery = useTimers({ world: scope.world });
  const [showHidden, setShowHidden] = useState(false);

  const filters =
    store.timersFilters[scope.settingsKey] ?? DEFAULT_TIMERS_FILTERS;

  const hiddenTimers = store.hiddenTimers[scope.settingsKey] ?? [];

  const projection = useTimerListProjection({
    context: { guildId: scope.guildId ?? "", isGrouping: scope.isGrouping },
    enabled: isOpen,
    filters: {
      maxLvl: filters.maxLvl,
      minLvl: filters.minLvl,
      searchText: store.timerFiltersSearchText,
      selectedColors: filters.selectedColors,
      selectedNpcTypes: filters.selectedNpcTypes,
      showHiddenTimers: showHidden,
    },
    preferences: {
      alwaysVisibleExpiredTimers: store.alwaysVisibleExpiredTimers,
      colorFiltersEnabled: store.colorFiltersEnabled,
      customColors: store.customColors,
      defaultColorNames: store.defaultColorNames,
      hiddenTimers,
      overriddenDefaultColors: store.overriddenDefaultColors,
      pinnedTimers: store.pinnedTimers[scope.settingsKey] ?? [],
      removeTimerAfterMs: store.generalConfig.removeTimerAfterMs,
      sortOrder: store.timersSortOrder,
      timersColors: store.timersColors,
    },
    timers: timersQuery.data ?? EMPTY_TIMERS,
  });

  const access = useTimerAccessPolicies(getTimerGuildIds(projection.timers));

  return {
    scope,
    list: {
      timers: projection.timers,
      hiddenTimerNames: new Set(hiddenTimers),
      hiddenTimers,
      colorStatistics: projection.colorStatistics,
      areFiltersActive: projection.areFiltersActive,
    },
    async: {
      ...resolveTimersAsyncState({
        hasResponse: timersQuery.data !== undefined,
        error: timersQuery.error,
        isFetching: timersQuery.isFetching,
        isLoading: timersQuery.isLoading,
      }),
      retry: () => {
        void timersQuery.refetch();
      },
    },
    toolbar: {
      filtersEnabled: store.timerFiltersEnabled,
      toggleFilters: store.toggleTimerFiltersEnabled,
      colorFiltersEnabled: store.colorFiltersEnabled,
      toggleColorFilters: store.toggleColorFiltersEnabled,
      sortOrder: store.timersSortOrder,
      setSortOrder: store.setTimersSortOrder,
      showHidden,
      setShowHidden,
    },
    appearance: {
      displayConfig: store.displayConfig,
      compactView: store.generalConfig.compactView,
      countdownMode: store.generalConfig.countdownMode,
      colors: {
        timersColors: store.timersColors,
        customColors: store.customColors,
        defaultColorNames: store.defaultColorNames,
        overriddenDefaultColors: store.overriddenDefaultColors,
        hiddenDefaultColors: store.hiddenDefaultColors,
      },
    },
    access,
    actions: {
      openAddTimer: () =>
        setOpen("add-timer", true, { guildId: scope.guildId }),
      resetFilters: () => {
        store.setTimerFiltersSearchText("");
        store.setTimersFilters(scope.settingsKey, {
          ...DEFAULT_TIMERS_FILTERS,
          selectedColors: [...DEFAULT_TIMERS_FILTERS.selectedColors],
          selectedNpcTypes: [...DEFAULT_TIMERS_FILTERS.selectedNpcTypes],
        });
        setShowHidden(true);
      },
      close: () => setOpen(surface === "window" ? "timers" : "timers", false),
    },
  };
};
