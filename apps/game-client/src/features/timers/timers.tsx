import { DraggableWindow } from "@/components/draggable-window";
import { GuildSelector } from "@/components/guild-selector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tile } from "@/components/ui/tile";
import { GatewayEvent } from "@/config/gateway";
import { SingleTimer } from "@/features/timers/components/single-timer";
import {
  Permission,
  useGuildPermissions,
} from "@/hooks/api/use-guild-permissions";
import { Timer, useTimers } from "@/hooks/api/use-timers";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useGlobalStore } from "@/store/global.store";
import { useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";
import { useQueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { PlusIcon } from "lucide-react";
import { useEffect, useRef, useState, useMemo } from "react";
import { useLocalStorage } from "react-use";

type TimerWithTimeLeft = Timer & { timeLeft: number };

const normalModeBreakpoints = [220, 300, 440, 580];
const compactModeBreakpoints = [110, 220, 330, 440, 550, 660];

const REQUIRED_DELETE_PERMISSIONS = [
  Permission.LOOTLOG_MANAGE,
  Permission.OWNER,
  Permission.ADMIN,
];

const mergeTimers = (timers: Timer[] = []) => {
  return timers.reduce((acc: Timer[], timer) => {
    const existing = acc.find(
      (t) => t.npcId === timer.npcId && t.guildId === timer.guildId
    );
    if (existing) {
      existing.members
        ? existing.members.push(timer.member)
        : (existing.members = [timer.member]);
    } else {
      acc.push({ ...timer, members: [timer.member] });
    }
    return acc;
  }, []);
};

export const Timers = () => {
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
  } = useTimersStore();
  const { characterId, accountId, world } = useGlobalStore((s) => s.gameState);
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    `timers-selected-guild`,
    ""
  );
  const { data: guildPermissions } = useGuildPermissions({
    guildId: selectedGuildId,
  });
  const [calculatedTimers, setCalculatedTimers] = useState<TimerWithTimeLeft[]>(
    []
  );
  const breakpoints = compactMode
    ? compactModeBreakpoints
    : normalModeBreakpoints;

  const queryClient = useQueryClient();
  const { data: timers } = useTimers({ world });
  const { socket, connected } = useGateway();

  const canDeleteTimers = useMemo(
    () =>
      REQUIRED_DELETE_PERMISSIONS.some((perm) =>
        guildPermissions?.includes(perm)
      ),
    [guildPermissions]
  );

  const mergedOrSeparatedTimers = useMemo((): Timer[] => {
    return timersGrouping ? mergeTimers(timers) : (timers ?? []);
  }, [timers, selectedGuildId, timersGrouping]);

  const updateCalculatedTimers = (timers: Timer[]) => {
    const now = Date.now();
    const newTimers = timers.reduce((acc: TimerWithTimeLeft[], timer) => {
      const timeLeft = new Date(timer.maxSpawnTime).getTime() - now;
      if (timeLeft > -removeTimerAfterMs) {
        acc.push({ ...timer, timeLeft });
      } else {
        handleTimerRemove(timer);
      }
      return acc;
    }, []);
    setCalculatedTimers(newTimers);
  };

  const handleTimerMessage = (data: Timer) => {
    queryClient.setQueryData(
      ["guild-timers", world],
      (old: AxiosResponse<Timer[]>) => {
        if (data.world !== world) return old;
        const updatedTimers = [...(old?.data || [])];
        const index = updatedTimers.findIndex(
          (t) =>
            t.npcId === data.npcId &&
            t.guildId === data.guildId &&
            t.world === data.world
        );

        if (index !== -1) {
          updatedTimers[index] = data;
        } else {
          updatedTimers.push(data);
        }

        updateCalculatedTimers(updatedTimers);
        return { data: updatedTimers };
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

        updateCalculatedTimers(filtered);
        return { data: filtered };
      }
    );
  };

  useEffect(() => {
    if (mergedOrSeparatedTimers.length > 0) {
      updateCalculatedTimers(mergedOrSeparatedTimers);
    }
  }, [mergedOrSeparatedTimers]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (mergedOrSeparatedTimers.length > 0) {
        updateCalculatedTimers(mergedOrSeparatedTimers);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [mergedOrSeparatedTimers, removeTimerAfterMs]);

  useEffect(() => {
    if (!connected) return;
    socket?.on(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
    socket?.on(GatewayEvent.TIMERS_DELETE, handleTimerRemove);

    return () => {
      socket?.off(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
      socket?.off(GatewayEvent.TIMERS_DELETE, handleTimerRemove);
    };
  }, [connected]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        const newCols = breakpoints.reduce(
          (acc, bp) => (width >= bp ? acc + 1 : acc),
          0
        );
        setColumns(newCols || 1);
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
    };
  }, [open, compactMode]);

  const key = `${accountId}${characterId}`;
  const sorted = calculatedTimers
    .sort((a, b) => {
      const isPinnedA = pinnedTimers[key]?.includes?.(a.npc.name);
      const isPinnedB = pinnedTimers[key]?.includes?.(b.npc.name);
      if (isPinnedA && !isPinnedB) return -1;
      if (!isPinnedA && isPinnedB) return 1;
      return (
        new Date(a.maxSpawnTime).getTime() - new Date(b.maxSpawnTime).getTime()
      );
    })
    .filter((timer) => {
      if (!timersGrouping && timer.guildId !== selectedGuildId) return false;
      return !hiddenTimers[key]?.includes?.(timer.npc.name);
    });

  const uniqueTimers = useMemo(() => {
    const map = new Map<number, TimerWithTimeLeft>();
    for (const timer of sorted) {
      if (!map.has(timer.npcId)) {
        map.set(timer.npcId, timer);
      }
    }
    return Array.from(map.values());
  }, [sorted]);

  return (
    open && (
      <DraggableWindow
        id="timers"
        title="Lootlog"
        actions={[
          <div
            className="ll-settings-button ll-custom-cursor-pointer"
            key="settings"
            onClick={() => toggleOpen("settings")}
          />,
          <div
            className="ll-players-button ll-custom-cursor-pointer ll-ml-1"
            key="online-players"
            onClick={() => toggleOpen("online-players")}
          />,
        ]}
        onClose={() => setOpen("timers", false)}
        minHeight={108}
      >
        <span
          ref={containerRef}
          className="ll-h-full ll-flex ll-flex-1 ll-flex-col ll-box-border ll-pt-1 ll-w-full"
        >
          {!timersGrouping && (
            <GuildSelector
              setSelectedGuildId={setSelectedGuildId}
              selectedGuildId={selectedGuildId}
              disabled={addTimerOpen}
            />
          )}
          <ScrollArea className="ll-h-full ll-py-1 ll-w-full" type="scroll">
            {uniqueTimers.length === 0 && (
              <span className="ll-text-white ll-w-full ll-flex ll-justify-center">
                ----
              </span>
            )}
            <span
              className="ll-grid ll-gap-0.5 ll-box-border"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {uniqueTimers.map((timer) => (
                <SingleTimer
                  key={`${timer.npcId}-${timer.guildId}`}
                  timer={timer}
                  timeLeft={timer.timeLeft}
                  compactMode={compactMode}
                  canDelete={canDeleteTimers}
                />
              ))}
            </span>
          </ScrollArea>

          {!timersGrouping && (
            <Tile onClick={() => toggleOpen("add-timer")}>
              <PlusIcon color="white" height={16} width={16} />
            </Tile>
          )}
        </span>
      </DraggableWindow>
    )
  );
};
