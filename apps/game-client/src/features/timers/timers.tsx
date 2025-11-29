import { useState } from "react";
import { DraggableWindow } from "@/components/draggable-window";
import { AnimatedWindow } from "@/components/animated-window";
import { type Timer, useTimers } from "@/hooks/api/use-timers";
import {
  DEFAULT_TIMERS_FILTERS,
  useUserSettings,
} from "@/hooks/api/use-timers-settings";
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
  filterTimersByRemovalTime,
} from "@/features/timers/utils/timers-utils";
import { checkFiltersActive } from "@/features/timers/utils/filters-utils";
import { calculateColorStatistics } from "@/features/timers/utils/color-statistics";
import { Game } from "@/lib/game";
import { useTimersSocket } from "@/features/timers/hooks/use-timers-socket";
import { useTimersSound } from "@/features/timers/hooks/use-timers-sound";

export type { TimerWithTimeLeft } from "@/features/timers/utils/timers-utils";

const EMPTY_TIMERS: Timer[] = [];

export const Timers = () => {
  const characterId = String(Game.hero.id);
  const gameInterface = Game.interface;
  const defaultWorld = Game.getWorldName();
  const { world, allowWorldSelection, guildIdByCharId } = useSettingsStore();

  const desiredWorld = world && allowWorldSelection ? world : defaultWorld;
  const guildId = guildIdByCharId[characterId];

  const { data: timers } = useTimers({ world: desiredWorld });

  const {
    timers: { open },
    toggleOpen,
    setOpen,
  } = useWindowsStore();

  useTimersSocket();

  const {
    hiddenTimers,
    pinnedTimers,
    soundEnabledTimers,
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
  } = useUserSettings({
    guildIds: [guildId, "global"].filter(Boolean) as string[],
  });

  const [showHiddenTimers, setShowHiddenTimers] = useState(false);

  const settingsKey = generalConfig.timersGrouping ? "global" : guildId;

  const filters = timersFilters[settingsKey] || DEFAULT_TIMERS_FILTERS;

  useTimers({ world: desiredWorld });

  const rawTimers = timers ? timers : EMPTY_TIMERS;

  const deduplicatedTimers = generalConfig.timersGrouping
    ? rawTimers
    : Array.from(
        new Map(
          rawTimers.map((timer) => {
            const compositeKey = `${timer.guildId}_${timer.world}_${timer.npcId}`;
            return [compositeKey, timer];
          }),
        ).values(),
      );

  const merged = generalConfig.timersGrouping
    ? mergeTimers(deduplicatedTimers)
    : deduplicatedTimers.map((timer) => ({
        ...timer,
        members: timer.member ? [timer.member] : [],
        minTimeLeft: 0,
        maxTimeLeft: 0,
      }));

  const withTimeLeft = calculateTimeLeft(merged);

  const activeTimers = filterTimersByRemovalTime(
    withTimeLeft,
    generalConfig.removeTimerAfterMs,
  );

  const calculatedTimers = useTimersUpdate(
    activeTimers,
    generalConfig.removeTimerAfterMs,
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
    hiddenTimers: hiddenTimers[settingsKey] || [],
    showHiddenTimers,
    searchText: timerFiltersSearchText ?? "",
    selectedNpcTypes: filters.selectedNpcTypes,
    minLvl: filters.minLvl,
    maxLvl: filters.maxLvl,
    selectedColors: filters.selectedColors,
    colorFiltersEnabled: colorFiltersEnabled ?? false,
    timersColors: timersColors as Record<string, string>,
    pinnedTimers: pinnedTimers[settingsKey] || [],
    sortOrder: timersSortOrder ?? "asc",
  });

  const colorStatistics = calculateColorStatistics(
    timersColors as Record<string, string>,
    sortedTimers,
    customColors,
    defaultColorNames as Record<string, string>,
    overriddenDefaultColors,
  );

  useTimersSound(calculatedTimers, soundEnabledTimers[settingsKey] || []);

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
            Timery
          </p>
        </div>
        <TimersContent
          sortedTimers={sortedTimers}
          settingsKey={settingsKey}
          hiddenTimers={hiddenTimers[settingsKey] || []}
          areFiltersActive={areFiltersActive}
          colorStatistics={colorStatistics}
          isGrouping={generalConfig.timersGrouping}
          allowWorldSelection={allowWorldSelection ?? false}
          timerFiltersEnabled={timerFiltersEnabled ?? false}
          isUnderBag={generalConfig.timersUnderBag}
          minColumnWidth={displayConfig.minColumnWidth}
          onAddTimer={() => toggleOpen("add-timer")}
        />
      </UnderBagTimers>
    );
  }

  return (
    <AnimatedWindow isOpen={open} windowKey="timers">
      <DraggableWindow
        id="timers"
        title="Timery"
        onClose={() => setOpen("timers", false)}
        minHeight={108}
        actions=<TimersActions
          timerFiltersEnabled={timerFiltersEnabled}
          toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
          colorFiltersEnabled={colorFiltersEnabled}
          toggleColorFiltersEnabled={toggleColorFiltersEnabled}
          timersSortOrder={timersSortOrder ?? "asc"}
          setTimersSortOrder={setTimersSortOrder}
          showHiddenTimers={showHiddenTimers}
          setShowHiddenTimers={setShowHiddenTimers}
        />
      >
        <div className="ll:flex ll:flex-col ll:h-full">
          <TimersContent
            sortedTimers={sortedTimers}
            settingsKey={settingsKey}
            hiddenTimers={hiddenTimers[settingsKey] || []}
            areFiltersActive={areFiltersActive}
            colorStatistics={colorStatistics}
            isGrouping={generalConfig.timersGrouping}
            allowWorldSelection={allowWorldSelection ?? false}
            timerFiltersEnabled={timerFiltersEnabled ?? false}
            isUnderBag={generalConfig.timersUnderBag}
            minColumnWidth={displayConfig.minColumnWidth}
            onAddTimer={() => toggleOpen("add-timer")}
          />
        </div>
      </DraggableWindow>
    </AnimatedWindow>
  );
};
