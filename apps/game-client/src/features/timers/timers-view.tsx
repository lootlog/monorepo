import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import type { Timer } from "@/api/timers.api";
import { DraggableWindow } from "@/components/draggable-window";
import { TimersActions } from "@/features/timers/components/timers-actions";
import { TimersContent } from "@/features/timers/components/timers-content";
import { TimersUnderBagActions } from "@/features/timers/components/timers-under-bag-actions";
import { useTimersFiltering } from "@/features/timers/hooks/use-timers-filtering";
import { useTimerRemovalBoundary } from "@/features/timers/hooks/use-timer-removal-boundary";
import { UnderBagTimers } from "@/features/timers/under-bag-timers";
import { calculateColorStatistics } from "@/features/timers/utils/color-statistics";
import { checkFiltersActive } from "@/features/timers/utils/filters-utils";
import {
  calculateTimeLeft,
  filterTimersByExpiredVisibility,
  mergeTimers,
} from "@/features/timers/utils/timers-utils";
import { useTimers } from "@/hooks/api/use-timers";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import { DEFAULT_TIMERS_FILTERS, useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";

const EMPTY_TIMERS: Timer[] = [];

const valueOr = <Value,>(value: Value | null | undefined, fallback: Value) =>
  value ?? fallback;

const getDeduplicatedTimers = (timers: Timer[], timersGrouping: boolean) => {
  if (timersGrouping) return timers;

  const timersByCompositeKey = new Map<string, Timer>();
  for (const timer of timers) {
    timersByCompositeKey.set(
      `${timer.guildId}_${timer.world}_${timer.timerKey}`,
      timer,
    );
  }

  return Array.from(timersByCompositeKey.values());
};

const normalizeUngroupedTimers = (timers: Timer[]) =>
  timers.map((timer) => ({
    ...timer,
    members: timer.member ? [timer.member] : [],
    actorCharactersByMemberId:
      timer.member && timer.actorCharacter
        ? { [String(timer.member.id)]: timer.actorCharacter }
        : timer.actorCharactersByMemberId,
    minTimeLeft: 0,
    maxTimeLeft: 0,
  }));

interface TimersViewProps {
  isOpen: boolean;
  isUnderBag: boolean;
}

export const TimersView = ({ isOpen, isUnderBag }: TimersViewProps) => {
  const { t } = useTranslation("timers");
  const characterId = useGameStore(
    (state) => state.game?.hero.characterId ?? "",
  );
  const defaultWorld = useGameStore((state) => state.game?.world ?? "unknown");
  const { worldByGuildId, allowWorldSelection, guildIdByCharId } =
    useSettingsStore(
      useShallow((state) => ({
        worldByGuildId: state.worldByGuildId,
        allowWorldSelection: state.allowWorldSelection,
        guildIdByCharId: state.guildIdByCharId,
      })),
    );
  const guildId = guildIdByCharId[characterId];
  const selectedWorld = guildId ? worldByGuildId[guildId] : undefined;
  const desiredWorld =
    selectedWorld && allowWorldSelection ? selectedWorld : defaultWorld;
  const setOpen = useWindowsStore((state) => state.setOpen);
  const {
    hiddenTimers,
    pinnedTimers,
    generalConfig,
    timerFiltersEnabled,
    toggleTimerFiltersEnabled,
    colorFiltersEnabled,
    toggleColorFiltersEnabled,
    timerFiltersSearchText,
    setTimerFiltersSearchText,
    timersSortOrder,
    setTimersSortOrder,
    timersFilters,
    setTimersFilters,
    displayConfig,
    timersColors,
    customColors,
    defaultColorNames,
    overriddenDefaultColors,
    alwaysVisibleExpiredTimers,
  } = useTimersStore(
    useShallow((state) => ({
      hiddenTimers: state.hiddenTimers,
      pinnedTimers: state.pinnedTimers,
      generalConfig: state.generalConfig,
      timerFiltersEnabled: state.timerFiltersEnabled,
      toggleTimerFiltersEnabled: state.toggleTimerFiltersEnabled,
      colorFiltersEnabled: state.colorFiltersEnabled,
      toggleColorFiltersEnabled: state.toggleColorFiltersEnabled,
      timerFiltersSearchText: state.timerFiltersSearchText,
      setTimerFiltersSearchText: state.setTimerFiltersSearchText,
      timersSortOrder: state.timersSortOrder,
      setTimersSortOrder: state.setTimersSortOrder,
      timersFilters: state.timersFilters,
      setTimersFilters: state.setTimersFilters,
      displayConfig: state.displayConfig,
      timersColors: state.timersColors,
      customColors: state.customColors,
      defaultColorNames: state.defaultColorNames,
      overriddenDefaultColors: state.overriddenDefaultColors,
      alwaysVisibleExpiredTimers: state.alwaysVisibleExpiredTimers,
    })),
  );
  const {
    data: timers,
    error: timersError,
    isFetching: timersFetching,
    isLoading: timersLoading,
    refetch: refetchTimers,
  } = useTimers({ world: desiredWorld });
  const hasTimersResponse = timers !== undefined;
  const initialTimersLoading = timersLoading && !hasTimersResponse;
  const timersRefreshError = Boolean(timersError) && hasTimersResponse;
  const timersRefreshing = timersFetching && hasTimersResponse;
  const [showHiddenTimers, setShowHiddenTimers] = useState(false);
  const settingsKey = generalConfig.timersGrouping ? "global" : guildId;
  const filters = valueOr(timersFilters[settingsKey], DEFAULT_TIMERS_FILTERS);
  const hiddenTimersForSettings = valueOr(hiddenTimers[settingsKey], []);
  const pinnedTimersForSettings = valueOr(pinnedTimers[settingsKey], []);
  const deduplicatedTimers = getDeduplicatedTimers(
    valueOr(timers, EMPTY_TIMERS),
    generalConfig.timersGrouping,
  );
  const mergedTimers = generalConfig.timersGrouping
    ? mergeTimers(deduplicatedTimers)
    : normalizeUngroupedTimers(deduplicatedTimers);
  const timerCalculationEpoch = useTimerRemovalBoundary(
    mergedTimers,
    generalConfig.removeTimerAfterMs,
    isUnderBag || isOpen,
  );
  const activeTimers = filterTimersByExpiredVisibility(
    calculateTimeLeft(mergedTimers, timerCalculationEpoch),
    generalConfig.removeTimerAfterMs,
    alwaysVisibleExpiredTimers,
  );
  const areFiltersActive = checkFiltersActive(
    valueOr(timerFiltersSearchText, ""),
    showHiddenTimers ? 0 : hiddenTimersForSettings.length,
    filters,
  );
  const visibleTimers = useTimersFiltering({
    calculatedTimers: activeTimers,
    isGrouping: generalConfig.timersGrouping,
    guildId: valueOr(guildId, ""),
    hiddenTimers: hiddenTimersForSettings,
    showHiddenTimers,
    searchText: valueOr(timerFiltersSearchText, ""),
    selectedNpcTypes: filters.selectedNpcTypes,
    minLvl: filters.minLvl,
    maxLvl: filters.maxLvl,
    selectedColors: filters.selectedColors,
    colorFiltersEnabled: valueOr(colorFiltersEnabled, false),
    timersColors: timersColors as Record<string, string>,
    pinnedTimers: pinnedTimersForSettings,
    sortOrder: valueOr(timersSortOrder, "asc"),
    expiredTimersAtBottom: true,
    removeTimerAfterMs: generalConfig.removeTimerAfterMs,
  });
  const sortedTimers = visibleTimers;
  const colorStatistics = calculateColorStatistics(
    timersColors as Record<string, string>,
    sortedTimers,
    customColors,
    defaultColorNames as Record<string, string>,
    overriddenDefaultColors,
  );
  const handleAddTimer = () => {
    setOpen("add-timer", true, { guildId });
  };
  const handleResetFilters = () => {
    setTimerFiltersSearchText("");
    setTimersFilters(settingsKey, {
      ...DEFAULT_TIMERS_FILTERS,
      selectedColors: [...DEFAULT_TIMERS_FILTERS.selectedColors],
      selectedNpcTypes: [...DEFAULT_TIMERS_FILTERS.selectedNpcTypes],
    });
    setShowHiddenTimers(true);
  };

  if (isUnderBag) {
    return (
      <UnderBagTimers>
        <TimersUnderBagActions
          timerFiltersEnabled={valueOr(timerFiltersEnabled, false)}
          toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
          colorFiltersEnabled={valueOr(colorFiltersEnabled, false)}
          toggleColorFiltersEnabled={toggleColorFiltersEnabled}
          timersSortOrder={valueOr(timersSortOrder, "asc")}
          setTimersSortOrder={setTimersSortOrder}
          showHiddenTimers={showHiddenTimers}
          setShowHiddenTimers={setShowHiddenTimers}
        />
        <div className="ll:bg-[0_0] ll:top-1 ll:leading-7 ll:-mt-1.5 ll-custom-cursor-pointer ll:absolute ll:left-1/2 ll:transform ll:-translate-x-1/2 ll:flex ll:gap-2 ll:items-center">
          <p className="ll:text-[12px] ll:text-[beige] ll:text-shadow-[1px_1px_1px_black]">
            {t("underBag.title")}
          </p>
        </div>
        <TimersContent
          sortedTimers={sortedTimers}
          settingsKey={settingsKey}
          hiddenTimers={hiddenTimersForSettings}
          areFiltersActive={areFiltersActive}
          colorStatistics={colorStatistics}
          guildId={guildId}
          isGrouping={generalConfig.timersGrouping}
          allowWorldSelection={valueOr(allowWorldSelection, false)}
          timerFiltersEnabled={valueOr(timerFiltersEnabled, false)}
          isUnderBag
          minColumnWidth={displayConfig.minColumnWidth}
          onAddTimer={handleAddTimer}
          onResetFilters={handleResetFilters}
          world={desiredWorld}
          compactView={generalConfig.compactView}
          error={!hasTimersResponse ? timersError : null}
          initialLoading={initialTimersLoading}
          onRetry={() => {
            void refetchTimers();
          }}
          refreshError={timersRefreshError}
          refreshing={timersRefreshing}
        />
      </UnderBagTimers>
    );
  }

  return (
    <DraggableWindow
      isOpen={isOpen}
      id="timers"
      title={t("window.title")}
      onClose={() => setOpen("timers", false)}
      minHeight={108}
      disableTitle={generalConfig.compactView}
      draggableContent={generalConfig.compactView}
      actions={
        !generalConfig.compactView ? (
          <TimersActions
            timerFiltersEnabled={timerFiltersEnabled}
            toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
            colorFiltersEnabled={colorFiltersEnabled}
            toggleColorFiltersEnabled={toggleColorFiltersEnabled}
            timersSortOrder={valueOr(timersSortOrder, "asc")}
            setTimersSortOrder={setTimersSortOrder}
            showHiddenTimers={showHiddenTimers}
            setShowHiddenTimers={setShowHiddenTimers}
          />
        ) : undefined
      }
    >
      <div className="ll:flex ll:flex-col ll:h-full">
        <TimersContent
          sortedTimers={sortedTimers}
          settingsKey={settingsKey}
          hiddenTimers={hiddenTimersForSettings}
          areFiltersActive={areFiltersActive}
          colorStatistics={colorStatistics}
          guildId={guildId}
          isGrouping={generalConfig.timersGrouping}
          allowWorldSelection={valueOr(allowWorldSelection, false)}
          timerFiltersEnabled={valueOr(timerFiltersEnabled, false)}
          isUnderBag={false}
          minColumnWidth={displayConfig.minColumnWidth}
          onAddTimer={handleAddTimer}
          onResetFilters={handleResetFilters}
          world={desiredWorld}
          compactView={generalConfig.compactView}
          error={!hasTimersResponse ? timersError : null}
          initialLoading={initialTimersLoading}
          onRetry={() => {
            void refetchTimers();
          }}
          refreshError={timersRefreshError}
          refreshing={timersRefreshing}
        />
      </div>
    </DraggableWindow>
  );
};
