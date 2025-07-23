import { useEffect, useRef, useState, useMemo } from "react";
import { useLocalStorage } from "react-use";
import { useQueryClient } from "@tanstack/react-query";
import { Filter, PlusIcon, SortAsc, SortDesc } from "lucide-react";
import { AxiosResponse } from "axios";
import { AnimatePresence, motion } from "framer-motion";

import { DraggableWindow } from "@/components/draggable-window";
import { GuildSelector } from "@/components/guild-selector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SingleTimer } from "@/features/timers/components/single-timer";
import {
  useGuildPermissions,
  Permission,
} from "@/hooks/api/use-guild-permissions";
import { useTimers, Timer } from "@/hooks/api/use-timers";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useGlobalStore } from "@/store/global.store";
import { DEFAULT_TIMERS_FILTERS, useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";
import { GatewayEvent } from "@/config/gateway";
import { GuildMember } from "@/hooks/api/use-guild-members";
import { UnderBagTimers } from "@/features/timers/under-bag-timers";
import { TimersFilters } from "@/features/timers/components/timers-filters";
import { cn } from "@/lib/utils";

type TimerWithTimeLeft = Timer & { timeLeft: number; members?: GuildMember[] };

const REQUIRED_DELETE_PERMISSIONS = [
  Permission.LOOTLOG_MANAGE,
  Permission.OWNER,
  Permission.ADMIN,
];

const mergeTimers = (timers: Timer[]): TimerWithTimeLeft[] => {
  const map = new Map<number, TimerWithTimeLeft>();

  for (const timer of timers) {
    const existing = map.get(timer.npcId);

    if (!existing) {
      map.set(timer.npcId, {
        ...timer,
        members: timer.member ? [timer.member] : [],
        timeLeft: 0, // placeholder
      });
    } else {
      if (new Date(timer.maxSpawnTime) > new Date(existing.maxSpawnTime)) {
        map.set(timer.npcId, {
          ...timer,
          members: [
            ...(existing.members || []),
            ...(timer.member ? [timer.member] : []),
          ],
          timeLeft: 0,
        });
      } else {
        existing.members = [
          ...(existing.members || []),
          ...(timer.member ? [timer.member] : []),
        ];
      }
    }
  }

  return Array.from(map.values());
};

export const Timers = () => {
  const { characterId, accountId, world, gameInterface } = useGlobalStore(
    (s) => s.gameState
  );
  const {
    timers: { open },
    "add-timer": { open: addTimerOpen },
    toggleOpen,
    setOpen,
  } = useWindowsStore();
  const {
    hiddenTimers,
    pinnedTimers,
    removeTimerAfterMs,
    compactMode,
    timersGrouping,
    timersUnderBag,
    timerFiltersEnabled,
    toggleTimerFiltersEnabled,
    timerFiltersSearchText,
    timersSortOrder,
    setTimersSortOrder,
    timersFilters,
  } = useTimersStore();
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    `ll:timers:selected-guild:${accountId}:${characterId}`,
    ""
  );
  const settingsKey = timersGrouping ? "global" : selectedGuildId!;
  const filters = timersFilters[settingsKey] || DEFAULT_TIMERS_FILTERS;

  const { data: guildPermissions } = useGuildPermissions({
    guildId: selectedGuildId,
  });
  const { data: timers } = useTimers({ world });
  const { socket, connected } = useGateway();
  const queryClient = useQueryClient();

  const [calculatedTimers, setCalculatedTimers] = useState<TimerWithTimeLeft[]>(
    []
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const canDeleteTimers = useMemo(
    () =>
      REQUIRED_DELETE_PERMISSIONS.some((perm) =>
        guildPermissions?.includes(perm)
      ),
    [guildPermissions]
  );

  const activeTimers = useMemo(() => {
    const rawTimers = timers ?? [];
    const merged = timersGrouping ? mergeTimers(rawTimers) : rawTimers;
    const now = Date.now();

    return merged
      .map((timer) => ({
        ...timer,
        timeLeft: new Date(timer.maxSpawnTime).getTime() - now,
      }))
      .filter((t) => t.timeLeft > -removeTimerAfterMs);
  }, [timers, timersGrouping, removeTimerAfterMs]);

  useEffect(() => {
    setCalculatedTimers(activeTimers);
  }, [activeTimers]);

  const handleTimerMessage = (data: Timer) => {
    queryClient.setQueryData(
      ["guild-timers", world],
      (old: AxiosResponse<Timer[]>) => {
        if (data.world !== world) return old;
        const updated = [...(old?.data || [])];
        const index = updated.findIndex(
          (t) =>
            t.npcId === data.npcId &&
            t.guildId === data.guildId &&
            t.world === data.world
        );
        index !== -1 ? (updated[index] = data) : updated.push(data);
        return { data: updated };
      }
    );
  };

  const handleTimerRemove = (data: Timer) => {
    queryClient.setQueryData(
      ["guild-timers", world],
      (old: AxiosResponse<Timer[]>) => {
        if (data.world !== world) return old;
        const filtered =
          old?.data.filter(
            (t) =>
              !(
                t.npcId === data.npcId &&
                t.world === data.world &&
                t.guildId === data.guildId
              )
          ) || [];
        return { data: filtered };
      }
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCalculatedTimers((prev) =>
        prev
          .map((timer) => ({
            ...timer,
            timeLeft: new Date(timer.maxSpawnTime).getTime() - now,
          }))
          .filter((t) => t.timeLeft > -removeTimerAfterMs)
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [removeTimerAfterMs]);

  useEffect(() => {
    if (!connected) return;
    socket?.on(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
    socket?.on(GatewayEvent.TIMERS_DELETE, handleTimerRemove);
    return () => {
      socket?.off(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
      socket?.off(GatewayEvent.TIMERS_DELETE, handleTimerRemove);
    };
  }, [connected]);

  const sortedTimers = useMemo(() => {
    return calculatedTimers
      .filter((t) => timersGrouping || t.guildId === selectedGuildId)
      .filter((t) => {
        return !hiddenTimers[settingsKey]?.includes?.(t.npc.name);
      })
      .filter((t) =>
        timerFiltersSearchText
          ? t.npc.name
              .toLowerCase()
              .includes(timerFiltersSearchText.toLowerCase())
          : true
      )
      .filter(
        (t) => filters.selectedNpcTypes.includes(t.npc.type) || t.npc.lvl === 0
      )
      .filter(
        (t) =>
          (t.npc.lvl >= filters.minLvl && t.npc.lvl <= filters.maxLvl) ||
          t.npc.lvl === 0
      )
      .sort((a, b) => {
        const pinA = pinnedTimers[settingsKey]?.includes?.(a.npc.name);
        const pinB = pinnedTimers[settingsKey]?.includes?.(b.npc.name);
        if (pinA && !pinB) return -1;
        if (!pinA && pinB) return 1;

        const timeA = new Date(a.maxSpawnTime).getTime();
        const timeB = new Date(b.maxSpawnTime).getTime();

        return timersSortOrder === "asc" ? timeA - timeB : timeB - timeA;
      });
  }, [
    calculatedTimers,
    selectedGuildId,
    hiddenTimers,
    pinnedTimers,
    timersGrouping,
    timerFiltersSearchText,
    timersSortOrder,
    filters.minLvl,
    filters.maxLvl,
    filters.selectedNpcTypes,
    settingsKey,
  ]);

  const renderTimers = () => {
    return (
      <span
        ref={containerRef}
        className={cn(
          "ll-h-full ll-flex ll-flex-1 ll-flex-col ll-box-border ll-pt-1 ll-w-full",
          {
            "!ll-pt-0": timersUnderBag,
          }
        )}
      >
        {timerFiltersEnabled && <TimersFilters filtersKey={settingsKey} />}
        {!timersGrouping && (
          <GuildSelector
            selectedGuildId={selectedGuildId}
            setSelectedGuildId={setSelectedGuildId}
            disabled={addTimerOpen}
            className="ll-bg-black/20 !ll-mb-1"
          />
        )}

        <ScrollArea
          className="ll-pb-1 !ll-w-full ll-py-1 ll-flex-1"
          type="hover"
        >
          {sortedTimers.length === 0 ? (
            <span className="ll-text-white ll-w-full ll-flex ll-justify-center">
              ----
            </span>
          ) : (
            <span
              className="ll-grid ll-gap-0.5 ll-box-border ll-w-full"
              style={{
                gridTemplateColumns: compactMode
                  ? "repeat(auto-fit, minmax(110px, 1fr))"
                  : "repeat(auto-fit, minmax(232px, 1fr))",
              }}
            >
              {sortedTimers.map((timer) => (
                <SingleTimer
                  key={`${timer.npcId}-${timer.guildId}`}
                  timer={timer}
                  timeLeft={timer.timeLeft}
                  compactMode={compactMode}
                  canDelete={canDeleteTimers}
                  settingsKey={settingsKey}
                />
              ))}
            </span>
          )}
        </ScrollArea>
      </span>
    );
  };

  if (timersUnderBag && gameInterface === "ni") {
    return (
      <UnderBagTimers>
        <div className="ll-flex ll-gap-1">
          <Filter
            key="filters"
            className="ll-custom-cursor-pointer -ll-mt-0.5 ll-stroke-gray-300 hover:ll-stroke-gray-100 ll-transition-colors ll-h-5 ll-mb-1"
            size="14"
            onClick={toggleTimerFiltersEnabled}
          />
          {timersSortOrder === "desc" ? (
            <SortDesc
              key="sort-desc"
              className="ll-custom-cursor-pointer ll-mt-0.5 ll-stroke-gray-300 hover:ll-stroke-gray-100 ll-transition-colors"
              size="14"
              onClick={() => setTimersSortOrder("asc")}
            />
          ) : (
            <SortAsc
              key="sort-asc"
              className="ll-custom-cursor-pointer ll-mt-0.5 ll-stroke-gray-300 hover:ll-stroke-gray-100 ll-transition-colors"
              size="14"
              onClick={() => setTimersSortOrder("desc")}
            />
          )}
          {!timersGrouping && (
            <PlusIcon
              key="add-timer"
              className="ll-custom-cursor-pointer ll-mt-0.5 ll-stroke-gray-300 hover:ll-stroke-gray-100 ll-transition-colors"
              size="14"
              onClick={() => toggleOpen("add-timer")}
            />
          )}
        </div>
        <div className="ll-bg-[0_0] ll-top-1 ll-leading-[28px] -ll-mt-1.5 ll-custom-cursor-pointer ll-absolute ll-left-1/2 ll-transform -ll-translate-x-1/2 ll-flex ll-gap-2 ll-items-center">
          <p className="ll-text-[11px] ll-text-[beige] ll-text-shadow-[1px_1px_1px_black]">
            Timery
          </p>
        </div>
        {renderTimers()}
      </UnderBagTimers>
    );
  }

  const actions = [
    <Filter
      key="filters"
      className="ll-custom-cursor-pointer ll-mt-0.5 ll-stroke-gray-300 hover:ll-stroke-gray-100 ll-transition-colors"
      size="14"
      onClick={toggleTimerFiltersEnabled}
    />,
    timersSortOrder === "desc" ? (
      <SortDesc
        key="sort-desc"
        className="ll-custom-cursor-pointer ll-mt-0.5 ll-stroke-gray-300 hover:ll-stroke-gray-100 ll-transition-colors"
        size="14"
        onClick={() => setTimersSortOrder("asc")}
      />
    ) : (
      <SortAsc
        key="sort-asc"
        className="ll-custom-cursor-pointer ll-mt-0.5 ll-stroke-gray-300 hover:ll-stroke-gray-100 ll-transition-colors"
        size="14"
        onClick={() => setTimersSortOrder("desc")}
      />
    ),
    !timersGrouping ? (
      <PlusIcon
        key="add-timer"
        className="ll-custom-cursor-pointer ll-mt-0.5 ll-stroke-gray-300 hover:ll-stroke-gray-100 ll-transition-colors"
        size="14"
        onClick={() => toggleOpen("add-timer")}
      />
    ) : null,
  ];

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
            actions={actions}
          >
            <div className="ll-flex ll-flex-col ll-h-full">
              {renderTimers()}
            </div>
          </DraggableWindow>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
