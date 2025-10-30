import { useEffect, useRef, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Filter, SortAsc, SortDesc, Info, Eye, EyeOff } from "lucide-react";
import type { AxiosResponse } from "axios";
import { AnimatePresence, motion } from "framer-motion";
import { DraggableWindow } from "@/components/draggable-window";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SingleTimer } from "@/features/timers/components/single-timer";
import { useTimers, type Timer } from "@/hooks/api/use-timers";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useGlobalStore } from "@/store/global.store";
import { DEFAULT_TIMERS_FILTERS, useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";
import { GatewayEvent } from "@/config/gateway";
import { UnderBagTimers } from "@/features/timers/under-bag-timers";
import { TimersFilters } from "@/features/timers/components/timers-filters";
import { cn } from "@/lib/utils";
import { WorldSelector } from "@/components/world-selector";
import { useSettingsStore } from "@/store/settings.store";
import type { GuildMember } from "@/hooks/api/use-guild-members";
import {
  Permission,
  useGuildPermissions,
} from "@/hooks/api/use-guild-permissions";
import { NpcType } from "@/hooks/api/use-npcs";
import { GuildSwitcher } from "@/components/guild-switcher";
import { TimersActions } from "@/features/timers/components/timers-actions";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";

export type TimerWithTimeLeft = Timer & {
  maxTimeLeft: number;
  minTimeLeft: number;
  members?: GuildMember[];
};

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
        minTimeLeft: 0,
        maxTimeLeft: 0,
      });
    } else {
      if (new Date(timer.maxSpawnTime) > new Date(existing.maxSpawnTime)) {
        map.set(timer.npcId, {
          ...timer,
          members: [
            ...(existing.members || []),
            ...(timer.member ? [timer.member] : []),
          ],
          minTimeLeft: 0,
          maxTimeLeft: 0,
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
  const {
    world: defaultWorld,
    gameInterface,
    characterId,
  } = useGlobalStore((s) => s.gameState);
  const {
    timers: { open },
    "add-timer": { open: addTimerOpen },
    toggleOpen,
    setOpen,
  } = useWindowsStore();
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
  const { world, allowWorldSelection, guildIdByCharId } = useSettingsStore();
  const guildId = guildIdByCharId[characterId!];
  const desiredWorld = generalConfig.timersGrouping
    ? defaultWorld
    : world || defaultWorld;
  const desiredWorldRef = useRef<string | undefined>(desiredWorld);

  const [showHiddenTimers, setShowHiddenTimers] = useState(false);

  useEffect(() => {
    desiredWorldRef.current = desiredWorld;
  }, [desiredWorld]);

  const settingsKey = generalConfig.timersGrouping ? "global" : guildId!;
  const filters = timersFilters[settingsKey] || DEFAULT_TIMERS_FILTERS;

  const { data: guildPermissions } = useGuildPermissions({
    guildId,
  });
  const { data: timers } = useTimers({
    world: desiredWorld,
  });
  const { socket, connected } = useGateway();
  const queryClient = useQueryClient();

  const [calculatedTimers, setCalculatedTimers] = useState<TimerWithTimeLeft[]>(
    [],
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const canDeleteTimers = useMemo(
    () =>
      REQUIRED_DELETE_PERMISSIONS.some((perm) =>
        guildPermissions?.includes(perm),
      ),
    [guildPermissions],
  );

  const activeTimers = useMemo(() => {
    const rawTimers = timers ?? [];
    const merged = generalConfig.timersGrouping
      ? mergeTimers(rawTimers)
      : rawTimers;
    const now = Date.now();

    return merged
      .map((timer) => ({
        ...timer,
        maxTimeLeft: new Date(timer.maxSpawnTime).getTime() - now,
        minTimeLeft: new Date(timer.minSpawnTime).getTime() - now,
      }))
      .filter((t) => t.maxTimeLeft > -generalConfig.removeTimerAfterMs);
  }, [timers, generalConfig.removeTimerAfterMs, generalConfig.timersGrouping]);

  useEffect(() => {
    setCalculatedTimers(activeTimers);
  }, [activeTimers]);

  const handleTimerMessage = (data: Timer) => {
    console.log("[TIMERS] Received timer message:", {
      npcName: data.npc.name,
      npcId: data.npcId,
      guildId: data.guildId,
      world: data.world,
      desiredWorld: desiredWorldRef.current,
      minSpawnTime: data.minSpawnTime,
      maxSpawnTime: data.maxSpawnTime,
    });

    queryClient.setQueryData(
      ["guild-timers", desiredWorldRef.current],
      (old: AxiosResponse<Timer[]>) => {
        console.log("[TIMERS] Current timers count:", old?.data?.length ?? 0);

        if (data.world !== desiredWorldRef.current) {
          console.log("[TIMERS] World mismatch - ignoring update", {
            dataWorld: data.world,
            desiredWorld: desiredWorldRef.current,
          });
          return old;
        }

        const updated = [...(old?.data || [])];

        const pendingIndex = updated.findIndex(
          (t) =>
            t.isPending &&
            t.npcId === data.npcId &&
            t.guildId === data.guildId &&
            t.world === data.world,
        );

        const existingIndex = updated.findIndex(
          (t) =>
            !t.isPending &&
            t.npcId === data.npcId &&
            t.guildId === data.guildId &&
            t.world === data.world,
        );

        console.log("[TIMERS] Indexes found:", {
          pendingIndex,
          existingIndex,
        });

        if (pendingIndex !== -1) {
          console.log("[TIMERS] Updating pending timer at index", pendingIndex);
          updated[pendingIndex] = { ...data, isPending: false };
        } else if (existingIndex !== -1) {
          console.log(
            "[TIMERS] Updating existing timer at index",
            existingIndex,
          );
          updated[existingIndex] = data;
        } else {
          console.log("[TIMERS] Adding new timer");
          updated.push(data);
        }

        console.log("[TIMERS] Updated timers count:", updated.length);
        return { data: updated };
      },
    );
  };

  const handleTimerRemove = (data: Timer) => {
    console.log("[TIMERS] Received timer remove:", {
      npcId: data.npcId,
      guildId: data.guildId,
      world: data.world,
      desiredWorld: desiredWorldRef.current,
    });

    queryClient.setQueryData(
      ["guild-timers", desiredWorldRef.current],
      (old: AxiosResponse<Timer[]>) => {
        console.log(
          "[TIMERS] Current timers before remove:",
          old?.data?.length ?? 0,
        );

        if (data.world !== desiredWorldRef.current) {
          console.log("[TIMERS] World mismatch - ignoring remove", {
            dataWorld: data.world,
            desiredWorld: desiredWorldRef.current,
          });
          return old;
        }

        const filtered =
          old?.data.filter(
            (t) =>
              !(
                t.npcId === data.npcId &&
                t.world === data.world &&
                t.guildId === data.guildId
              ),
          ) || [];

        console.log("[TIMERS] Timers after remove:", filtered.length);
        return { data: filtered };
      },
    );
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setCalculatedTimers((prev) =>
        prev
          .map((timer) => ({
            ...timer,
            maxTimeLeft: new Date(timer.maxSpawnTime).getTime() - now,
            minTimeLeft: new Date(timer.minSpawnTime).getTime() - now,
          }))
          .filter((t) => t.maxTimeLeft > -generalConfig.removeTimerAfterMs),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [generalConfig]);

  useEffect(() => {
    if (!connected) {
      console.log("[TIMERS] Socket not connected, skipping event registration");
      return;
    }

    console.log("[TIMERS] Registering socket event listeners", {
      socketId: socket?.id,
      connected,
    });

    socket?.on(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
    socket?.on(GatewayEvent.TIMERS_DELETE, handleTimerRemove);

    return () => {
      console.log("[TIMERS] Unregistering socket event listeners");
      socket?.off(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
      socket?.off(GatewayEvent.TIMERS_DELETE, handleTimerRemove);
    };
  }, [connected]);

  const areFiltersActive = useMemo(() => {
    const hasSearchText = !!timerFiltersSearchText;
    const hasHiddenTimers = (hiddenTimers[settingsKey]?.length ?? 0) > 0;
    const hasCustomLvlRange =
      filters.minLvl !== DEFAULT_TIMERS_FILTERS.minLvl ||
      filters.maxLvl !== DEFAULT_TIMERS_FILTERS.maxLvl;
    const hasCustomNpcTypes =
      filters.selectedNpcTypes.length !==
        DEFAULT_TIMERS_FILTERS.selectedNpcTypes.length ||
      !filters.selectedNpcTypes.every((type) =>
        DEFAULT_TIMERS_FILTERS.selectedNpcTypes.includes(type),
      );
    const hasColorFilters = filters.selectedColors.length > 0;

    return (
      hasSearchText ||
      hasHiddenTimers ||
      hasCustomLvlRange ||
      hasCustomNpcTypes ||
      hasColorFilters
    );
  }, [
    timerFiltersSearchText,
    hiddenTimers,
    settingsKey,
    filters.minLvl,
    filters.maxLvl,
    filters.selectedNpcTypes,
    filters.selectedColors,
  ]);

  const sortedTimers = useMemo(() => {
    return calculatedTimers
      .filter((t) => generalConfig.timersGrouping || t.guildId === guildId)
      .filter((t) => {
        const isHidden = hiddenTimers[settingsKey]?.includes?.(t.npc.name);
        return showHiddenTimers ? true : !isHidden;
      })
      .filter((t) =>
        timerFiltersSearchText
          ? t.npc.name
              .toLowerCase()
              .includes(timerFiltersSearchText.toLowerCase())
          : true,
      )
      .filter(
        (t) =>
          filters.selectedNpcTypes.includes(t.npc.type) ||
          t.npc.lvl === 0 ||
          t.npc.type === NpcType.NPC,
      )
      .filter(
        (t) =>
          (t.npc.lvl >= filters.minLvl && t.npc.lvl <= filters.maxLvl) ||
          t.npc.lvl === 0,
      )
      .filter((t) => {
        if (filters.selectedColors.length === 0) return true;
        const timerColor = timersColors[t.npc.name];
        return timerColor && filters.selectedColors.includes(timerColor);
      })
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
    guildId,
    hiddenTimers,
    pinnedTimers,
    generalConfig.timersGrouping,
    timerFiltersSearchText,
    timersSortOrder,
    filters.minLvl,
    filters.maxLvl,
    filters.selectedNpcTypes,
    filters.selectedColors,
    timersColors,
    settingsKey,
    showHiddenTimers,
  ]);

  const colorStatistics = useMemo(() => {
    const defaultNames: Record<string, string> = {
      red: "Czerwony",
      orange: "Pomarańczowy",
      yellow: "Żółty",
      lime: "Limonkowy",
      green: "Zielony",
      teal: "Turkusowy",
      sky: "Niebieski",
      blue: "Granatowy",
      violet: "Fioletowy",
      purple: "Purpurowy",
      pink: "Różowy",
      white: "Biały",
    };

    const stats: Record<
      string,
      {
        total: number;
        active: number;
        name: string;
        bgColor?: string;
        borderColor?: string;
      }
    > = {};

    Object.keys(TIMERS_COLORS).forEach((color) => {
      const overridden = overriddenDefaultColors[color];
      stats[color] = {
        total: 0,
        active: 0,
        name: defaultColorNames[color] || defaultNames[color] || color,
        bgColor: overridden?.backgroundColor,
        borderColor: overridden?.borderColor,
      };
    });

    Object.values(customColors).forEach((color) => {
      stats[color.id] = {
        total: 0,
        active: 0,
        name: color.name,
        bgColor: color.backgroundColor,
        borderColor: color.borderColor,
      };
    });

    Object.entries(timersColors).forEach(([_npcName, color]) => {
      if (color && stats[color]) {
        stats[color].total++;
      }
    });

    sortedTimers.forEach((timer) => {
      const color = timersColors[timer.npc.name];
      if (color && stats[color]) {
        stats[color].active++;
      }
    });

    return Object.entries(stats)
      .filter(([, stat]) => stat.total > 0)
      .map(([color, stat]) => ({
        color,
        ...stat,
      }));
  }, [
    timersColors,
    sortedTimers,
    customColors,
    defaultColorNames,
    overriddenDefaultColors,
  ]);

  const renderTimers = () => {
    return (
      <span
        ref={containerRef}
        className={cn(
          "ll:h-full ll:flex ll:flex-1 ll:flex-col ll:box-border ll:pt-1 ll:w-full",
          {
            "ll:pt-0!": generalConfig.timersUnderBag,
          },
        )}
      >
        {!generalConfig.timersGrouping && (
          <GuildSwitcher className="ll:mb-1!" />
        )}
        {allowWorldSelection && !generalConfig.timersGrouping && (
          <WorldSelector />
        )}
        {timerFiltersEnabled && <TimersFilters filtersKey={settingsKey} />}

        <ScrollArea className="ll:py-1 ll:w-full! ll:flex-1" type="hover">
          {sortedTimers.length === 0 ? (
            <span className="ll:w-full ll:flex ll:justify-center ll:text-center ll:mt-6 ll:text-gray-400">
              {areFiltersActive ? "Brak timerów dla wybranych filtrów" : "----"}
            </span>
          ) : (
            <span
              className="ll:grid ll:gap-0.5 ll:box-border ll:w-full"
              style={{
                gridTemplateColumns: `repeat(auto-fit, minmax(${displayConfig.minColumnWidth}px, 1fr))`,
              }}
            >
              {sortedTimers.map((timer) => {
                const isHidden = hiddenTimers[settingsKey]?.includes?.(
                  timer.npc.name,
                );
                return (
                  <SingleTimer
                    key={`${timer.npcId}-${timer.guildId}`}
                    timer={timer}
                    maxTimeLeft={timer.maxTimeLeft}
                    minTimeLeft={timer.minTimeLeft}
                    canDelete={canDeleteTimers}
                    settingsKey={settingsKey}
                    isHidden={isHidden}
                  />
                );
              })}
            </span>
          )}
        </ScrollArea>

        <div className="ll:flex ll:items-center ll:border-t ll:border-gray-600 ll:pt-1 ll:pb-0.5 ll:px-1 ll:relative">
          <Tooltip>
            <TooltipTrigger asChild>
              <Info
                className="ll-custom-cursor-pointer ll:stroke-gray-400 ll:hover:stroke-gray-200 ll:transition-colors ll:absolute ll:left-1"
                size={14}
              />
            </TooltipTrigger>
            <TooltipContent side="top" className="ll:max-w-xs">
              <div className="ll:flex ll:flex-col ll:gap-1">
                <p className="ll:text-xs ll:font-semibold ll:mb-1">
                  Statystyki kolorów timerów
                </p>
                {colorStatistics.length === 0 ? (
                  <p className="ll:text-xs ll:text-gray-400">
                    Brak ustawionych kolorów
                  </p>
                ) : (
                  colorStatistics.map((stat) => {
                    const defaultColor =
                      TIMERS_COLORS[stat.color as keyof typeof TIMERS_COLORS];
                    const hasCustomColors = stat.bgColor || stat.borderColor;

                    return (
                      <div
                        key={stat.color}
                        className="ll:flex ll:items-center ll:gap-2 ll:text-xs"
                      >
                        <div
                          className={cn(
                            "ll:size-3 ll:rounded-sm ll:border",
                            !hasCustomColors && defaultColor?.bgNoOpacity,
                            !hasCustomColors && defaultColor?.border,
                          )}
                          style={
                            hasCustomColors
                              ? {
                                  backgroundColor: stat.bgColor,
                                  borderColor: stat.borderColor,
                                }
                              : undefined
                          }
                        />
                        <span className="ll:text-gray-200">
                          {stat.name}: {stat.active}/{stat.total}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </TooltipContent>
          </Tooltip>
          <button
            type="button"
            className="ll:text-[12px] ll:border ll:border-gray-400 ll:bg-gray-400/30 ll:hover:bg-gray-400/50 ll:rounded-sm ll:h-5 ll:text-white ll:px-4 ll-custom-cursor-pointer ll:mx-auto"
            onClick={() => toggleOpen("add-timer")}
          >
            +
          </button>
        </div>
      </span>
    );
  };

  if (generalConfig.timersUnderBag && gameInterface === "ni") {
    return (
      <UnderBagTimers>
        <div className="ll:flex ll:gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Filter
                key="filters"
                className="ll-custom-cursor-pointer ll:-mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors ll:h-5 ll:mb-1"
                size="14"
                onClick={toggleTimerFiltersEnabled}
              />
            </TooltipTrigger>
            <TooltipContent side="top">
              {timerFiltersEnabled ? "Ukryj filtry" : "Pokaż filtry"}
            </TooltipContent>
          </Tooltip>
          {timersSortOrder === "desc" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <SortDesc
                  key="sort-desc"
                  className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
                  size="14"
                  onClick={() => setTimersSortOrder("asc")}
                />
              </TooltipTrigger>
              <TooltipContent side="top">Sortuj rosnąco</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <SortAsc
                  key="sort-asc"
                  className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
                  size="14"
                  onClick={() => setTimersSortOrder("desc")}
                />
              </TooltipTrigger>
              <TooltipContent side="top">Sortuj malejąco</TooltipContent>
            </Tooltip>
          )}
          {showHiddenTimers ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Eye
                  key="show-hidden"
                  className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
                  size="14"
                  onClick={() => setShowHiddenTimers(false)}
                />
              </TooltipTrigger>
              <TooltipContent side="top">Ukryj ukryte timery</TooltipContent>
            </Tooltip>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <EyeOff
                  key="hide-hidden"
                  className="ll-custom-cursor-pointer ll:mt-0.5 ll:stroke-gray-300 ll:hover:stroke-gray-100 ll:transition-colors"
                  size="14"
                  onClick={() => setShowHiddenTimers(true)}
                />
              </TooltipTrigger>
              <TooltipContent side="top">Pokaż ukryte timery</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="ll:bg-[0_0] ll:top-1 ll:leading-7 ll:-mt-1.5 ll-custom-cursor-pointer ll:absolute ll:left-1/2 ll:transform ll:-translate-x-1/2 ll:flex ll:gap-2 ll:items-center">
          <p className="ll:text-[11px] ll:text-[beige] ll:text-shadow-[1px_1px_1px_black]">
            Timery
          </p>
        </div>
        {renderTimers()}
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
              {renderTimers()}
            </div>
          </DraggableWindow>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
