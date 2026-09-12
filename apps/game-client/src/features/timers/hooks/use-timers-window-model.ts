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
  setColorFiltersEnabled,
  setTimerFiltersEnabled,
  setTimersSortOrder,
} from "@/features/timers/settings/timer-settings-writers";
import {
  useGuildTimerLists,
  useTimerAppearanceSettings,
  useTimerBehaviorSettings,
} from "@/features/timers/settings/use-timer-settings";
import {
  DEFAULT_TIMERS_FILTERS,
  useTimerFiltersStore,
} from "@/features/timers/timer-filters.store";
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
    pinnedTimers: string[];
    alwaysVisibleExpiredTimers: Record<string, string[]>;
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

  const { behavior } = useTimerBehaviorSettings();
  const { appearance } = useTimerAppearanceSettings();

  const scope = resolveTimersScope({
    characterId,
    guildIdByCharId,
    worldByGuildId,
    allowWorldSelection,
    gameWorld,
    isGrouping: behavior.generalConfig.timersGrouping,
  });

  const lists = useGuildTimerLists(scope.settingsKey);

  const { filters, searchText, resetFilters } = useTimerFiltersStore(
    useShallow((state) => ({
      filters: state.timersFilters[scope.settingsKey] ?? DEFAULT_TIMERS_FILTERS,
      searchText: state.searchText,
      resetFilters: state.resetFilters,
    })),
  );

  const timersQuery = useTimers({ world: scope.world });
  const [showHidden, setShowHidden] = useState(false);

  const projection = useTimerListProjection({
    context: { guildId: scope.guildId ?? "", isGrouping: scope.isGrouping },
    enabled: isOpen,
    filters: {
      maxLvl: filters.maxLvl,
      minLvl: filters.minLvl,
      searchText,
      selectedColors: filters.selectedColors,
      selectedNpcTypes: filters.selectedNpcTypes,
      showHiddenTimers: showHidden,
    },
    preferences: {
      alwaysVisibleExpiredTimers: behavior.alwaysVisibleExpiredTimers,
      colorFiltersEnabled: behavior.colorFiltersEnabled,
      customColors: appearance.customColors,
      defaultColorNames: appearance.defaultColorNames,
      hiddenTimers: lists.hiddenTimers,
      overriddenDefaultColors: appearance.overriddenDefaultColors,
      pinnedTimers: lists.pinnedTimers,
      removeTimerAfterMs: behavior.generalConfig.removeTimerAfterMs,
      sortOrder: behavior.timersSortOrder,
      timersColors: appearance.timersColors,
    },
    timers: timersQuery.data ?? EMPTY_TIMERS,
  });

  const access = useTimerAccessPolicies(getTimerGuildIds(projection.timers));

  return {
    scope,
    list: {
      timers: projection.timers,
      hiddenTimerNames: new Set(lists.hiddenTimers),
      hiddenTimers: lists.hiddenTimers,
      pinnedTimers: lists.pinnedTimers,
      alwaysVisibleExpiredTimers: behavior.alwaysVisibleExpiredTimers,
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
      filtersEnabled: behavior.timerFiltersEnabled,
      toggleFilters: () =>
        setTimerFiltersEnabled(!behavior.timerFiltersEnabled),
      colorFiltersEnabled: behavior.colorFiltersEnabled,
      toggleColorFilters: () =>
        setColorFiltersEnabled(!behavior.colorFiltersEnabled),
      sortOrder: behavior.timersSortOrder,
      setSortOrder: setTimersSortOrder,
      showHidden,
      setShowHidden,
    },
    appearance: {
      displayConfig: appearance.displayConfig,
      compactView: behavior.generalConfig.compactView,
      countdownMode: behavior.generalConfig.countdownMode,
      colors: {
        timersColors: appearance.timersColors,
        customColors: appearance.customColors,
        defaultColorNames: appearance.defaultColorNames,
        overriddenDefaultColors: appearance.overriddenDefaultColors,
        hiddenDefaultColors: appearance.hiddenDefaultColors,
      },
    },
    access,
    actions: {
      openAddTimer: () =>
        setOpen("add-timer", true, { guildId: scope.guildId }),
      resetFilters: () => {
        resetFilters(scope.settingsKey);
        setShowHidden(true);
      },
      close: () => setOpen("timers", false),
    },
  };
};
