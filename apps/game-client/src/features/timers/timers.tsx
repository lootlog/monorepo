import { useState } from "react";
import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import type { Timer } from "@/api/timers.api";
import { useTimers } from "@/hooks/api/use-timers";
import { DEFAULT_TIMERS_FILTERS, useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";
import { UnderBagTimers } from "@/features/timers/under-bag-timers";
import { useSettingsStore } from "@/store/settings.store";
import { TimersActions } from "@/features/timers/components/timers-actions";
import { TimersContent } from "@/features/timers/components/timers-content";
import { TimersUnderBagActions } from "@/features/timers/components/timers-under-bag-actions";
import { useTimersUpdate } from "@/features/timers/hooks/use-timers-update";
import { useTimersFiltering } from "@/features/timers/hooks/use-timers-filtering";
import {
  mergeTimers,
  calculateTimeLeft,
  filterTimersByExpiredVisibility,
} from "@/features/timers/utils/timers-utils";
import { checkFiltersActive } from "@/features/timers/utils/filters-utils";
import { calculateColorStatistics } from "@/features/timers/utils/color-statistics";
import { Game } from "@/lib/game";
import { useTimersSocket } from "@/features/timers/hooks/use-timers-socket";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";

const EMPTY_TIMERS: Timer[] = [];

const getDeduplicatedTimers = (timers: Timer[], timersGrouping: boolean) => {
  if (timersGrouping) return timers;

  const timersByCompositeKey = new Map<string, Timer>();

  for (const timer of timers) {
    const compositeKey = `${timer.guildId}_${timer.world}_${timer.timerKey}`;
    timersByCompositeKey.set(compositeKey, timer);
  }

  return Array.from(timersByCompositeKey.values());
};

const normalizeUngroupedTimers = (timers: Timer[]) => {
  return timers.map((timer) => ({
    ...timer,
    members: timer.member ? [timer.member] : [],
    actorCharactersByMemberId:
      timer.member && timer.actorCharacter
        ? { [String(timer.member.id)]: timer.actorCharacter }
        : timer.actorCharactersByMemberId,
    minTimeLeft: 0,
    maxTimeLeft: 0,
  }));
};

export const Timers = () => {
  const { t } = useTranslation("timers");
  const characterId = String(Game.hero.id);
  const gameInterface = Game.interface;
  const defaultWorld = Game.getWorldName();
  const { worldByGuildId, allowWorldSelection, guildIdByCharId } =
    useSettingsStore(
      useShallow((state) => ({
        worldByGuildId: state.worldByGuildId,
        allowWorldSelection: state.allowWorldSelection,
        guildIdByCharId: state.guildIdByCharId,
      })),
    );

  const guildId = guildIdByCharId[characterId];
  const world = guildId ? worldByGuildId[guildId] : undefined;
  const desiredWorld = world && allowWorldSelection ? world : defaultWorld;

  const open = useWindowsStore((state) => state.timers.open);
  const setOpen = useWindowsStore((state) => state.setOpen);

  useTimersSocket();

  const {
    hiddenTimers,
    pinnedTimers,
    generalConfig,
    timerFiltersEnabled,
    toggleTimerFiltersEnabled,
    colorFiltersEnabled,
    toggleColorFiltersEnabled,
    timerFiltersSearchText,
    timersSortOrder,
    setTimersSortOrder,
    timersFilters,
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
      timersSortOrder: state.timersSortOrder,
      setTimersSortOrder: state.setTimersSortOrder,
      timersFilters: state.timersFilters,
      displayConfig: state.displayConfig,
      timersColors: state.timersColors,
      customColors: state.customColors,
      defaultColorNames: state.defaultColorNames,
      overriddenDefaultColors: state.overriddenDefaultColors,
      alwaysVisibleExpiredTimers: state.alwaysVisibleExpiredTimers,
    })),
  );

  const { data: timers } = useTimers({ world: desiredWorld });

  const [showHiddenTimers, setShowHiddenTimers] = useState(false);

  const settingsKey = generalConfig.timersGrouping ? "global" : guildId;
  const filters = timersFilters[settingsKey] ?? DEFAULT_TIMERS_FILTERS;
  const hiddenTimersForSettings = hiddenTimers[settingsKey] ?? [];
  const pinnedTimersForSettings = pinnedTimers[settingsKey] ?? [];

  const rawTimers = timers ? timers : EMPTY_TIMERS;

  const deduplicatedTimers = getDeduplicatedTimers(
    rawTimers,
    generalConfig.timersGrouping,
  );

  const merged = generalConfig.timersGrouping
    ? mergeTimers(deduplicatedTimers)
    : normalizeUngroupedTimers(deduplicatedTimers);

  const withTimeLeft = calculateTimeLeft(merged);

  const activeTimers = filterTimersByExpiredVisibility(
    withTimeLeft,
    generalConfig.removeTimerAfterMs,
    alwaysVisibleExpiredTimers,
  );

  const calculatedTimers = useTimersUpdate(
    activeTimers,
    generalConfig.removeTimerAfterMs,
    alwaysVisibleExpiredTimers,
  );

  const areFiltersActive = checkFiltersActive(
    timerFiltersSearchText ?? "",
    hiddenTimers[settingsKey]?.length ?? 0,
    filters,
  );

  const sortedTimers = useTimersFiltering({
    calculatedTimers,
    isGrouping: generalConfig.timersGrouping,
    guildId: guildId ?? "",
    hiddenTimers: hiddenTimersForSettings,
    showHiddenTimers,
    searchText: timerFiltersSearchText ?? "",
    selectedNpcTypes: filters.selectedNpcTypes,
    minLvl: filters.minLvl,
    maxLvl: filters.maxLvl,
    selectedColors: filters.selectedColors,
    colorFiltersEnabled: colorFiltersEnabled ?? false,
    timersColors: timersColors as Record<string, string>,
    pinnedTimers: pinnedTimersForSettings,
    sortOrder: timersSortOrder ?? "asc",
    expiredTimersAtBottom: true,
    removeTimerAfterMs: generalConfig.removeTimerAfterMs,
  });

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

  if (generalConfig.timersUnderBag && gameInterface === "ni") {
    return (
      <UnderBagTimers>
        <TimersUnderBagActions
          timerFiltersEnabled={timerFiltersEnabled ?? false}
          toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
          colorFiltersEnabled={colorFiltersEnabled ?? false}
          toggleColorFiltersEnabled={toggleColorFiltersEnabled}
          timersSortOrder={timersSortOrder ?? "asc"}
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
          allowWorldSelection={allowWorldSelection ?? false}
          timerFiltersEnabled={timerFiltersEnabled ?? false}
          isUnderBag={generalConfig.timersUnderBag}
          minColumnWidth={displayConfig.minColumnWidth}
          onAddTimer={handleAddTimer}
          world={desiredWorld}
          compactView={generalConfig.compactView}
        />
      </UnderBagTimers>
    );
  }

  return (
    <AnimatedWindow isOpen={open} windowKey="timers">
      <DraggableWindow
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
              timersSortOrder={timersSortOrder ?? "asc"}
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
            allowWorldSelection={allowWorldSelection ?? false}
            timerFiltersEnabled={timerFiltersEnabled ?? false}
            isUnderBag={generalConfig.timersUnderBag}
            minColumnWidth={displayConfig.minColumnWidth}
            onAddTimer={handleAddTimer}
            world={desiredWorld}
            compactView={generalConfig.compactView}
          />
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};
