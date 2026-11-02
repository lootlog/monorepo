import { useTimerFilters } from "@/features/timers/hooks/use-timer-filters";
import { useDeferredValue, useState } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import type { Timer } from "@/api/timers.api";
import { DraggableWindow } from "@/components/draggable-window/draggable-window";
import { AddTimerPanel } from "@/features/timers/components/add-timer-panel";
import { TimersActions } from "@/features/timers/components/timers-actions";
import { TimersContent } from "@/features/timers/components/timers-content";
import { useTimersWorld } from "@/features/timers/hooks/use-timers-world";
import { useTimerListProjection } from "@/features/timers/hooks/use-timer-list-projection";
import { UnderBagTimers } from "@/features/timers/under-bag-timers";
import { useTimers } from "@/hooks/api/use-timers";
import { DEFAULT_TIMERS_FILTERS, useTimersStore } from "@/store/timers.store";
import { GLOBAL_TIMER_SETTINGS_KEY } from "@/store/timer-settings-sync";
import { useWindowsStore } from "@/store/windows.store";

const EMPTY_TIMERS: Timer[] = [];

interface TimersViewProps {
  isOpen: boolean;
  isUnderBag: boolean;
}

export const TimersView = ({ isOpen, isUnderBag }: TimersViewProps) => {
  const { t } = useTranslation("timers");

  const {
    allowWorldSelection,
    guildId,
    world: desiredWorld,
  } = useTimersWorld();

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
    displayConfig,
    timersColors,
    customLists,
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
      displayConfig: state.displayConfig,
      timersColors: state.timersColors,
      customLists: state.customLists,
      alwaysVisibleExpiredTimers: state.alwaysVisibleExpiredTimers,
    })),
  );

  const {
    data: timers,
    error: timersError,
    isFetching: timersFetching,
    isPending: timersLoading,
    refetch: refetchTimers,
  } = useTimers({ world: desiredWorld });

  const hasTimersResponse = timers !== undefined;
  const initialTimersLoading = timersLoading && !hasTimersResponse;
  const timersRefreshError = Boolean(timersError) && hasTimersResponse;
  const timersRefreshing = timersFetching && hasTimersResponse;
  const [showHiddenTimers, setShowHiddenTimers] = useState(false);

  const settingsKey = generalConfig.timersGrouping
    ? GLOBAL_TIMER_SETTINGS_KEY
    : guildId;

  const { filters, setFilters } = useTimerFilters(settingsKey, desiredWorld);
  const hiddenTimersForSettings = hiddenTimers[settingsKey] ?? [];

  // Typing updates the search box at once; the grid re-filters in an
  // interruptible render that the next keystroke can abandon.
  const deferredSearchText = useDeferredValue(timerFiltersSearchText);

  const { areFiltersActive, timers: sortedTimers } = useTimerListProjection({
    context: {
      guildId: guildId ?? "",
      isGrouping: generalConfig.timersGrouping,
    },
    enabled: isOpen,
    filters: {
      maxLvl: filters.maxLvl,
      minLvl: filters.minLvl,
      searchText: deferredSearchText,
      selectedColors: filters.selectedColors,
      selectedLists: filters.selectedLists,
      selectedNpcTypes: filters.selectedNpcTypes,
      showHiddenTimers,
    },
    preferences: {
      alwaysVisibleExpiredTimers,
      colorFiltersEnabled,
      customLists,
      hiddenTimers: hiddenTimersForSettings,
      pinnedTimers: pinnedTimers[settingsKey] ?? [],
      removeTimerAfterMs: generalConfig.removeTimerAfterMs,
      sortOrder: timersSortOrder,
      timersColors,
    },
    timers: timers ?? EMPTY_TIMERS,
  });

  const handleAddTimer = () => {
    setAddTimerOpen((open) => !open);
  };

  // The window frame is rounded; the panel follows its bottom corners so it
  // does not overlap the border.
  const addTimerOverlay = addTimerOpen ? (
    <AddTimerPanel
      guildId={guildId}
      world={desiredWorld}
      onClose={() => setAddTimerOpen(false)}
      className={isUnderBag ? undefined : "ll:rounded-b-md"}
    />
  ) : null;

  const handleResetFilters = () => {
    setTimerFiltersSearchText("");
    setFilters({
      ...DEFAULT_TIMERS_FILTERS,
      selectedColors: [...DEFAULT_TIMERS_FILTERS.selectedColors],
      selectedLists: [...DEFAULT_TIMERS_FILTERS.selectedLists],
      selectedNpcTypes: [...DEFAULT_TIMERS_FILTERS.selectedNpcTypes],
    });
    setShowHiddenTimers(true);
  };

  const actions = generalConfig.compactView ? undefined : (
    <TimersActions
      timerFiltersEnabled={timerFiltersEnabled}
      toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
      colorFiltersEnabled={colorFiltersEnabled}
      toggleColorFiltersEnabled={toggleColorFiltersEnabled}
      timersSortOrder={timersSortOrder}
      setTimersSortOrder={setTimersSortOrder}
      showHiddenTimers={showHiddenTimers}
      setShowHiddenTimers={setShowHiddenTimers}
      guildId={guildId}
      world={desiredWorld}
      isGrouping={generalConfig.timersGrouping}
      addTimerOpen={addTimerOpen}
      onAddTimer={handleAddTimer}
    />
  );

  const content = (
    <TimersContent
      world={desiredWorld}
      sortedTimers={sortedTimers}
      settingsKey={settingsKey}
      hiddenTimers={hiddenTimersForSettings}
      areFiltersActive={areFiltersActive}
      isGrouping={generalConfig.timersGrouping}
      allowWorldSelection={allowWorldSelection ?? false}
      timerFiltersEnabled={timerFiltersEnabled}
      isUnderBag={isUnderBag}
      minColumnWidth={displayConfig.minColumnWidth}
      legacyAppearance={displayConfig.legacyAppearance}
      onResetFilters={handleResetFilters}
      compactView={generalConfig.compactView}
      error={!hasTimersResponse ? timersError : null}
      initialLoading={initialTimersLoading}
      onRetry={() => {
        void refetchTimers();
      }}
      refreshError={timersRefreshError}
      refreshing={timersRefreshing}
      hasData={hasTimersResponse}
      overlay={addTimerOverlay}
    />
  );

  if (isUnderBag) {
    return (
      <UnderBagTimers>
        {/* Mirrors the window title bar: actions lead, the title sits in the
            middle column, and the empty trailing column keeps it centered.
            Same height as the title bar, with no gap before the content.
            Compact view hides it, as it hides the window's title bar. */}
        {actions && (
          <div className="ll:grid ll:h-6 ll:shrink-0 ll:grid-cols-[1fr_auto_1fr] ll:items-center ll:gap-1 ll:px-0.5">
            <div className="ll:flex ll:items-center ll:justify-self-start">
              {actions}
            </div>
            <p className="ll:min-w-0 ll:truncate ll:text-center ll:text-xs ll:font-semibold ll:leading-none ll:tracking-wide ll:text-gray-100">
              {t("underBag.title")}
            </p>
            <div aria-hidden="true" />
          </div>
        )}
        {content}
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
      actions={actions}
    >
      <div className="ll:flex ll:flex-col ll:h-full">{content}</div>
    </DraggableWindow>
  );
};
