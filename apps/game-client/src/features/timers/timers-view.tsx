import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import type { Timer } from "@/api/timers.api";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { AddTimerPanel } from "@/features/timers/components/add-timer-panel";
import { TimersActions } from "@/features/timers/components/timers-actions";
import { TimersContent } from "@/features/timers/components/timers-content";
import { useSocket } from "@/contexts/socket-context";
import { useTimerListProjection } from "@/features/timers/hooks/use-timer-list-projection";
import { UnderBagTimers } from "@/features/timers/under-bag-timers";
import { useTimers } from "@/hooks/api/use-timers";
import { useGameStore } from "@/store/game.store";
import { useSettingsStore } from "@/store/settings.store";
import { DEFAULT_TIMERS_FILTERS, useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";

const EMPTY_TIMERS: Timer[] = [];

interface TimersViewProps {
  isOpen: boolean;
  isUnderBag: boolean;
}

type TimersStoreState = ReturnType<typeof useTimersStore.getState>;

const getTimersViewState = ({
  settingsKey,
  timersFilters,
  hiddenTimers,
  pinnedTimers,
  timerFiltersSearchText,
  timerFiltersEnabled,
  colorFiltersEnabled,
  timersSortOrder,
  allowWorldSelection,
  timers,
}: {
  settingsKey: string;
  timersFilters: TimersStoreState["timersFilters"];
  hiddenTimers: TimersStoreState["hiddenTimers"];
  pinnedTimers: TimersStoreState["pinnedTimers"];
  timerFiltersSearchText: TimersStoreState["timerFiltersSearchText"];
  timerFiltersEnabled: TimersStoreState["timerFiltersEnabled"];
  colorFiltersEnabled: TimersStoreState["colorFiltersEnabled"];
  timersSortOrder: TimersStoreState["timersSortOrder"];
  allowWorldSelection: boolean | undefined;
  timers: Timer[] | undefined;
}) => ({
  filters: timersFilters[settingsKey] ?? DEFAULT_TIMERS_FILTERS,
  hiddenTimers: hiddenTimers[settingsKey] ?? [],
  pinnedTimers: pinnedTimers[settingsKey] ?? [],
  searchText: timerFiltersSearchText ?? "",
  timerFiltersEnabled: timerFiltersEnabled ?? false,
  colorFiltersEnabled: colorFiltersEnabled ?? false,
  sortOrder: timersSortOrder ?? "asc",
  allowWorldSelection: allowWorldSelection ?? false,
  timers: timers ?? EMPTY_TIMERS,
});

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
  const [addTimerOpen, setAddTimerOpen] = useState(false);

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

  const { connected, joined } = useSocket();

  const hasTimersResponse = timers !== undefined;
  const initialTimersLoading = timersLoading && !hasTimersResponse;
  const timersRefreshError = Boolean(timersError) && hasTimersResponse;
  // Realtime updates stop while the gateway is down, so a loaded list may
  // already be behind the server.
  const timersStale = hasTimersResponse && (!connected || !joined);
  const timersRefreshing = timersFetching && hasTimersResponse;
  const [showHiddenTimers, setShowHiddenTimers] = useState(false);
  const settingsKey = generalConfig.timersGrouping ? "global" : guildId;

  const {
    filters,
    hiddenTimers: hiddenTimersForSettings,
    pinnedTimers: pinnedTimersForSettings,
    searchText,
    timerFiltersEnabled: resolvedTimerFiltersEnabled,
    colorFiltersEnabled: resolvedColorFiltersEnabled,
    sortOrder,
    allowWorldSelection: resolvedAllowWorldSelection,
    timers: resolvedTimers,
  } = getTimersViewState({
    settingsKey,
    timersFilters,
    hiddenTimers,
    pinnedTimers,
    timerFiltersSearchText,
    timerFiltersEnabled,
    colorFiltersEnabled,
    timersSortOrder,
    allowWorldSelection,
    timers,
  });

  const { areFiltersActive, timers: sortedTimers } = useTimerListProjection({
    context: {
      guildId: guildId ?? "",
      isGrouping: generalConfig.timersGrouping,
    },
    enabled: isUnderBag || isOpen,
    filters: {
      maxLvl: filters.maxLvl,
      minLvl: filters.minLvl,
      searchText,
      selectedColors: filters.selectedColors,
      selectedNpcTypes: filters.selectedNpcTypes,
      showHiddenTimers,
    },
    preferences: {
      alwaysVisibleExpiredTimers,
      colorFiltersEnabled: resolvedColorFiltersEnabled,
      hiddenTimers: hiddenTimersForSettings,
      pinnedTimers: pinnedTimersForSettings,
      removeTimerAfterMs: generalConfig.removeTimerAfterMs,
      sortOrder,
      timersColors,
    },
    timers: resolvedTimers,
  });

  const handleAddTimer = () => {
    setAddTimerOpen((open) => !open);
  };

  // The window frame is rounded; the panel follows its bottom corners so it
  // does not overlap the border.
  const addTimerOverlay = addTimerOpen ? (
    <AddTimerPanel
      guildId={guildId}
      onClose={() => setAddTimerOpen(false)}
      className={isUnderBag ? undefined : "ll:rounded-b-md"}
    />
  ) : null;

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
        <div className="ll:flex ll:gap-1">
          <TimersActions
            timerFiltersEnabled={resolvedTimerFiltersEnabled}
            toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
            colorFiltersEnabled={resolvedColorFiltersEnabled}
            toggleColorFiltersEnabled={toggleColorFiltersEnabled}
            timersSortOrder={sortOrder}
            setTimersSortOrder={setTimersSortOrder}
            showHiddenTimers={showHiddenTimers}
            setShowHiddenTimers={setShowHiddenTimers}
            guildId={guildId}
            world={desiredWorld}
            isGrouping={generalConfig.timersGrouping}
            addTimerOpen={addTimerOpen}
            onAddTimer={handleAddTimer}
          />
        </div>
        <div className="ll:bg-[0_0] ll:top-1 ll:leading-7 ll:-mt-1.5 ll-custom-cursor-pointer ll:absolute ll:left-1/2 ll:transform ll:-translate-x-1/2 ll:flex ll:gap-2 ll:items-center">
          <p className="ll:text-xs ll:font-semibold ll:leading-none ll:tracking-wide ll:text-gray-100">
            {t("underBag.title")}
          </p>
        </div>
        <TimersContent
          sortedTimers={sortedTimers}
          settingsKey={settingsKey}
          hiddenTimers={hiddenTimersForSettings}
          areFiltersActive={areFiltersActive}
          isGrouping={generalConfig.timersGrouping}
          allowWorldSelection={resolvedAllowWorldSelection}
          timerFiltersEnabled={resolvedTimerFiltersEnabled}
          isUnderBag
          minColumnWidth={displayConfig.minColumnWidth}
          onResetFilters={handleResetFilters}
          compactView={generalConfig.compactView}
          error={!hasTimersResponse ? timersError : null}
          initialLoading={initialTimersLoading}
          onRetry={() => {
            void refetchTimers();
          }}
          refreshError={timersRefreshError}
          refreshing={timersRefreshing}
          stale={timersStale}
          overlay={addTimerOverlay}
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
      contentClassName={
        generalConfig.compactView ? undefined : "ll:-mx-1 ll:-mb-1"
      }
      disableTitle={generalConfig.compactView}
      draggableContent={generalConfig.compactView}
      actions={
        !generalConfig.compactView ? (
          <TimersActions
            timerFiltersEnabled={timerFiltersEnabled}
            toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
            colorFiltersEnabled={colorFiltersEnabled}
            toggleColorFiltersEnabled={toggleColorFiltersEnabled}
            timersSortOrder={sortOrder}
            setTimersSortOrder={setTimersSortOrder}
            showHiddenTimers={showHiddenTimers}
            setShowHiddenTimers={setShowHiddenTimers}
            guildId={guildId}
            world={desiredWorld}
            isGrouping={generalConfig.timersGrouping}
            addTimerOpen={addTimerOpen}
            onAddTimer={handleAddTimer}
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
          isGrouping={generalConfig.timersGrouping}
          allowWorldSelection={resolvedAllowWorldSelection}
          timerFiltersEnabled={resolvedTimerFiltersEnabled}
          isUnderBag={false}
          minColumnWidth={displayConfig.minColumnWidth}
          onResetFilters={handleResetFilters}
          compactView={generalConfig.compactView}
          error={!hasTimersResponse ? timersError : null}
          initialLoading={initialTimersLoading}
          onRetry={() => {
            void refetchTimers();
          }}
          refreshError={timersRefreshError}
          refreshing={timersRefreshing}
          stale={timersStale}
          overlay={addTimerOverlay}
        />
      </div>
    </DraggableWindow>
  );
};
