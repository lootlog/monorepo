import { useEffect, useRef, useState, useMemo } from "react";
import { useLocalStorage } from "react-use";
import { useQueryClient } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { AxiosResponse } from "axios";

import { DraggableWindow } from "@/components/draggable-window";
import { GuildSelector } from "@/components/guild-selector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tile } from "@/components/ui/tile";
import { SingleTimer } from "@/features/timers/components/single-timer";
import {
  useGuildPermissions,
  Permission,
} from "@/hooks/api/use-guild-permissions";
import { useTimers, Timer } from "@/hooks/api/use-timers";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useGlobalStore } from "@/store/global.store";
import { useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";
import { GatewayEvent } from "@/config/gateway";

type TimerWithTimeLeft = Timer & { timeLeft: number };

const BREAKPOINTS = {
  normal: [220, 300, 440, 580],
  compact: [110, 220, 330, 440, 550, 660],
};

const REQUIRED_DELETE_PERMISSIONS = [
  Permission.LOOTLOG_MANAGE,
  Permission.OWNER,
  Permission.ADMIN,
];

const mergeTimers = (timers: Timer[]): Timer[] => {
  const map = new Map<string, Timer>();
  timers.forEach((timer) => {
    const key = `${timer.npcId}-${timer.guildId}`;
    if (!map.has(key)) {
      map.set(key, { ...timer, members: [timer.member] });
    } else {
      map.get(key)!.members?.push(timer.member);
    }
  });
  return Array.from(map.values());
};

export const Timers = () => {
  const { characterId, accountId, world } = useGlobalStore((s) => s.gameState);
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
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    "timers-selected-guild",
    ""
  );
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
  const [columns, setColumns] = useState(1);

  const canDeleteTimers = useMemo(
    () =>
      REQUIRED_DELETE_PERMISSIONS.some((perm) =>
        guildPermissions?.includes(perm)
      ),
    [guildPermissions]
  );

  const activeTimers = useMemo(
    () => (timersGrouping ? mergeTimers(timers ?? []) : (timers ?? [])),
    [timers, timersGrouping]
  );

  const updateCalculatedTimers = (inputTimers: Timer[]) => {
    const now = Date.now();
    const updated = inputTimers
      .map((timer) => ({
        ...timer,
        timeLeft: new Date(timer.maxSpawnTime).getTime() - now,
      }))
      .filter((t) => t.timeLeft > -removeTimerAfterMs);

    setCalculatedTimers(updated);
  };

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
        updateCalculatedTimers(updated);
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
        updateCalculatedTimers(filtered);
        return { data: filtered };
      }
    );
  };

  useEffect(() => {
    if (activeTimers.length) updateCalculatedTimers(activeTimers);
  }, [activeTimers]);

  useEffect(() => {
    const interval = setInterval(
      () => updateCalculatedTimers(activeTimers),
      1000
    );
    return () => clearInterval(interval);
  }, [activeTimers, removeTimerAfterMs]);

  useEffect(() => {
    if (!connected) return;
    socket?.on(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
    socket?.on(GatewayEvent.TIMERS_DELETE, handleTimerRemove);
    return () => {
      socket?.off(GatewayEvent.TIMERS_CREATE, handleTimerMessage);
      socket?.off(GatewayEvent.TIMERS_DELETE, handleTimerRemove);
    };
  }, [connected]);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      const bps = compactMode ? BREAKPOINTS.compact : BREAKPOINTS.normal;
      const cols = bps.reduce((acc, bp) => (width >= bp ? acc + 1 : acc), 0);
      setColumns(cols || 1);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [open, compactMode]);

  const key = `${accountId}${characterId}`;
  const sortedTimers = useMemo(() => {
    return calculatedTimers
      .filter((t) => timersGrouping || t.guildId === selectedGuildId)
      .filter((t) => !hiddenTimers[key]?.includes?.(t.npc.name))
      .sort((a, b) => {
        const pinA = pinnedTimers[key]?.includes?.(a.npc.name);
        const pinB = pinnedTimers[key]?.includes?.(b.npc.name);
        if (pinA && !pinB) return -1;
        if (!pinA && pinB) return 1;
        return (
          new Date(a.maxSpawnTime).getTime() -
          new Date(b.maxSpawnTime).getTime()
        );
      });
  }, [
    calculatedTimers,
    selectedGuildId,
    hiddenTimers,
    pinnedTimers,
    timersGrouping,
  ]);

  return (
    open && (
      <DraggableWindow
        id="timers"
        title="Lootlog"
        actions={[
          <div
            key="settings"
            className="ll-settings-button ll-custom-cursor-pointer"
            onClick={() => toggleOpen("settings")}
          />,
          <div
            key="online-players"
            className="ll-players-button ll-custom-cursor-pointer ll-ml-1"
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
          <ScrollArea className="ll-h-full ll-py-1 ll-w-full" type="scroll">
            {!timersGrouping && (
              <GuildSelector
                selectedGuildId={selectedGuildId}
                setSelectedGuildId={setSelectedGuildId}
                disabled={addTimerOpen}
              />
            )}
            {sortedTimers.length === 0 ? (
              <span className="ll-text-white ll-w-full ll-flex ll-justify-center">
                ----
              </span>
            ) : (
              <span
                className="ll-grid ll-gap-0.5 ll-box-border"
                style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
              >
                {sortedTimers.map((timer) => (
                  <SingleTimer
                    key={`${timer.npcId}-${timer.guildId}`}
                    timer={timer}
                    timeLeft={timer.timeLeft}
                    compactMode={compactMode}
                    canDelete={canDeleteTimers}
                  />
                ))}
              </span>
            )}
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
