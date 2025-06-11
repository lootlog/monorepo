import { DraggableWindow } from "@/components/draggable-window";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SingleTimer } from "@/features/timers/components/single-timer";
import { TimerTile } from "@/features/timers/components/timer-tile";
import { Timer, useTimers } from "@/hooks/api/use-timers";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useGlobalStore } from "@/store/global.store";
import { useTimersStore } from "@/store/timers.store";
import { useWindowsStore } from "@/store/windows.store";
import { useQueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { PlusIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type TimerWithTimeLeft = Timer & { timeLeft: number };

const normalModeBreakpoints = [220, 300, 440, 580];
const compactModeBreakpoints = [110, 220, 330, 440, 550, 660];

export const Timers = () => {
  const {
    timers: { open },
    setOpen,
  } = useWindowsStore();
  const { hiddenTimers, pinnedTimers, removeTimerAfterMs, compactMode } =
    useTimersStore();
  const { characterId, accountId, world } = useGlobalStore((s) => s.gameState);

  const [calculatedTimers, setCalculatedTimers] = useState<TimerWithTimeLeft[]>(
    []
  );
  const breakpoints = compactMode
    ? compactModeBreakpoints
    : normalModeBreakpoints;

  const queryClient = useQueryClient();
  const { data: timers } = useTimers({ world });
  const { socket, connected } = useGateway();

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
        const updatedTimers = old?.data.find((t) => t.npc.id === data.npc.id)
          ? old.data.map((t) => (t.npc.id === data.npc.id ? data : t))
          : [...old.data, data];

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
          old?.data.filter((t) => t.npc.id !== data.npc.id) || [];
        updateCalculatedTimers(filtered);
        return { data: filtered };
      }
    );
  };

  useEffect(() => {
    if (timers && timers.length > 0) {
      updateCalculatedTimers(timers);
    }
  }, [timers]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (timers && timers.length > 0) {
        updateCalculatedTimers(timers);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timers, removeTimerAfterMs]);

  useEffect(() => {
    if (socket?.hasListeners("timers-create") || !connected) return;
    socket?.on("timers-create", handleTimerMessage);
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

  const sorted = calculatedTimers.sort((a, b) => {
    const key = `${accountId}${characterId}`;
    const isPinnedA = pinnedTimers[key]?.includes?.(a.npc.name);
    const isPinnedB = pinnedTimers[key]?.includes?.(b.npc.name);

    if (isPinnedA && !isPinnedB) return -1;
    if (!isPinnedA && isPinnedB) return 1;
    return (
      new Date(a.maxSpawnTime).getTime() - new Date(b.maxSpawnTime).getTime()
    );
  });

  const filtered = sorted.filter((timer) => {
    const key = `${accountId}${characterId}`;
    return !hiddenTimers[key]?.includes?.(timer.npc.name);
  });

  return (
    open && (
      <DraggableWindow
        id="timers"
        title="Lootlog"
        actions={[
          <div
            className="ll-settings-button ll-custom-cursor-pointer"
            key="settings"
            onClick={() => setOpen("settings", true)}
          />,
        ]}
        onClose={() => setOpen("timers", false)}
        minHeight={108}
      >
        <span
          ref={containerRef}
          className="ll-h-full ll-flex ll-flex-1 ll-flex-col ll-box-border ll-pt-1 ll-w-full"
        >
          {filtered.length === 0 && (
            <span className="ll-text-white ll-w-full ll-flex ll-justify-center">
              ----
            </span>
          )}

          <ScrollArea className="ll-h-full ll-py-1 ll-w-full" type="scroll">
            <span
              className="ll-grid ll-gap-0.5 ll-box-border"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {filtered.map((timer) => (
                <SingleTimer
                  key={timer.npc.id}
                  timer={timer}
                  timeLeft={timer.timeLeft}
                  compactMode={compactMode}
                />
              ))}
            </span>
          </ScrollArea>

          <TimerTile>
            <PlusIcon color="white" height={16} width={16} />
          </TimerTile>
        </span>
      </DraggableWindow>
    )
  );
};
