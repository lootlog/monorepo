import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { DraggableWindow } from "@/components/draggable-window";
import { useTimers } from "@/hooks/api/use-timers";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useGlobalStore } from "@/store/global.store";
import { DEFAULT_TIMERS_FILTERS, useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";
import { UnderBagTimers } from "@/features/timers/under-bag-timers";
import { useSettingsStore } from "@/store/settings.store";
import { useGuildPermissions } from "@/hooks/api/use-guild-permissions";
import { TimersActions } from "@/features/timers/components/timers-actions";
import { TimersContent } from "@/features/timers/components/timers-content";
import { TimersUnderBagActions } from "@/features/timers/components/timers-under-bag-actions";
import { useTimersUpdate } from "@/features/timers/hooks/use-timers-update";
import { useTimersFiltering } from "@/features/timers/hooks/use-timers-filtering";
import { useTimersSocket } from "@/features/timers/hooks/use-timers-socket";
import {
  mergeTimers,
  calculateTimeLeft,
  filterTimersByRemovalTime,
} from "@/features/timers/utils/timers-utils";
import { checkFiltersActive } from "@/features/timers/utils/filters-utils";
import { calculateColorStatistics } from "@/features/timers/utils/color-statistics";
import { REQUIRED_DELETE_PERMISSIONS } from "@/features/timers/constants/required-delete-permissions";

export type { TimerWithTimeLeft } from "@/features/timers/utils/timers-utils";

export const Timers = () => {
  console.log("[TIMERS] === Component render start ===");

  const {
    world: defaultWorld,
    gameInterface,
    characterId,
  } = useGlobalStore((s) => s.gameState);

  console.log("[TIMERS] Global state:", {
    defaultWorld,
    gameInterface,
    characterId,
  });

  const {
    timers: { open },
    toggleOpen,
    setOpen,
  } = useWindowsStore();

  console.log("[TIMERS] Windows state:", { open });

  const {
    hiddenTimers,
    pinnedTimers,
    generalConfig,
    timerFiltersEnabled,
    toggleTimerFiltersEnabled,
    timerFiltersSearchText,
    timersSortOrder,
    setTimersSortOrder,
    timersFilters,
    displayConfig,
    timersColors,
    customColors,
    defaultColorNames,
    overriddenDefaultColors,
  } = useTimersStore();

  console.log("[TIMERS] Timers store:", {
    generalConfig,
    timerFiltersEnabled,
    timerFiltersSearchText,
    timersSortOrder,
    displayConfig,
  });

  const { world, allowWorldSelection, guildIdByCharId } = useSettingsStore();
  const guildId = guildIdByCharId[characterId!];
  const desiredWorld = generalConfig.timersGrouping
    ? defaultWorld
    : world || defaultWorld;

  console.log("[TIMERS] Settings:", { world, guildId, desiredWorld });

  const [showHiddenTimers, setShowHiddenTimers] = useState(false);

  const settingsKey = generalConfig.timersGrouping ? "global" : guildId!;
  const filters = timersFilters[settingsKey] || DEFAULT_TIMERS_FILTERS;

  console.log("[TIMERS] Settings key:", settingsKey);
  console.log("[TIMERS] Filters:", filters);

  const { data: guildPermissions } = useGuildPermissions({ guildId });
  const { data: timers } = useTimers({ world: desiredWorld });
  const { socket, connected } = useGateway();

  console.log("[TIMERS] API data:", {
    timersCount: timers?.length ?? 0,
    permissionsCount: guildPermissions?.length ?? 0,
    socketConnected: connected,
    socketId: socket?.id,
  });

  const canDeleteTimers = REQUIRED_DELETE_PERMISSIONS.some((perm) =>
    guildPermissions?.includes(perm),
  );

  const rawTimers = timers ?? [];
  console.log("[TIMERS] Raw timers count:", rawTimers.length);

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

  if (
    !generalConfig.timersGrouping &&
    rawTimers.length !== deduplicatedTimers.length
  ) {
    console.warn("[TIMERS] Removed duplicate timers:", {
      original: rawTimers.length,
      deduplicated: deduplicatedTimers.length,
    });
  }

  const merged = generalConfig.timersGrouping
    ? mergeTimers(deduplicatedTimers)
    : deduplicatedTimers.map((timer) => ({
        ...timer,
        members: timer.member ? [timer.member] : [],
        minTimeLeft: 0,
        maxTimeLeft: 0,
      }));
  console.log("[TIMERS] Merged timers count:", merged.length);

  const withTimeLeft = calculateTimeLeft(merged);
  console.log("[TIMERS] With time left count:", withTimeLeft.length);

  const activeTimers = filterTimersByRemovalTime(
    withTimeLeft,
    generalConfig.removeTimerAfterMs,
  );
  console.log("[TIMERS] Active timers count:", activeTimers.length);
  console.log("[TIMERS] Active timers reference:", activeTimers);

  console.log("[TIMERS] Calling useTimersUpdate with activeTimers");
  const calculatedTimers = useTimersUpdate(
    activeTimers,
    generalConfig.removeTimerAfterMs,
  );
  console.log("[TIMERS] Calculated timers count:", calculatedTimers.length);
  console.log("[TIMERS] Calculated timers reference:", calculatedTimers);

  console.log("[TIMERS] Calling useTimersSocket");
  useTimersSocket(socket ?? null, connected ?? false, desiredWorld ?? "");

  const areFiltersActive = checkFiltersActive(
    timerFiltersSearchText ?? "",
    hiddenTimers[settingsKey]?.length ?? 0,
    filters,
  );

  console.log("[TIMERS] Filters active:", areFiltersActive);
  console.log("[TIMERS] Calling useTimersFiltering");

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
    timersColors: timersColors as Record<string, string>,
    pinnedTimers: pinnedTimers[settingsKey] || [],
    sortOrder: timersSortOrder ?? "asc",
  });

  console.log("[TIMERS] Sorted timers count:", sortedTimers.length);

  const colorStatistics = calculateColorStatistics(
    timersColors as Record<string, string>,
    sortedTimers,
    customColors,
    defaultColorNames as Record<string, string>,
    overriddenDefaultColors,
  );

  console.log("[TIMERS] Color statistics:", colorStatistics);
  console.log("[TIMERS] === Component render end ===\n");

  if (generalConfig.timersUnderBag && gameInterface === "ni") {
    return (
      <UnderBagTimers>
        <TimersUnderBagActions
          timerFiltersEnabled={timerFiltersEnabled ?? false}
          toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
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
          canDeleteTimers={canDeleteTimers}
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
    <AnimatePresence>
      {open && (
        <motion.div
          key="timers"
          initial={{ opacity: 0, scaleY: 1.01 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 1.01 }}
          transition={{ duration: 0.1 }}
        >
          <DraggableWindow
            id="timers"
            title="Timery"
            onClose={() => setOpen("timers", false)}
            minHeight={108}
            actions=<TimersActions
              timerFiltersEnabled={timerFiltersEnabled}
              toggleTimerFiltersEnabled={toggleTimerFiltersEnabled}
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
                canDeleteTimers={canDeleteTimers}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
};
