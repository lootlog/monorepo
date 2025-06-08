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

export const Timers = () => {
  const {
    timers: { open },
    setOpen,
  } = useWindowsStore();
  const { hiddenTimers, pinnedTimers } = useTimersStore();
  const { characterId, accountId } = useGlobalStore((state) => state.gameState);

  const { world } = useGlobalStore((state) => state.gameState);

  const queryClient = useQueryClient();
  const { data: timers } = useTimers({ world });

  const { socket, connected } = useGateway();

  const sorted = timers?.sort((a, b) => {
    const key = `${accountId}${characterId}`;
    const isPinnedA = pinnedTimers[key]?.includes?.(a.npc.name);
    const isPinnedB = pinnedTimers[key]?.includes?.(b.npc.name);

    if (isPinnedA && !isPinnedB) return -1;
    if (!isPinnedA && isPinnedB) return 1;

    return (
      new Date(a.maxSpawnTime).getTime() - new Date(b.maxSpawnTime).getTime()
    );
  });

  const filtered = sorted?.filter((timer) => {
    const key = `${accountId}${characterId}`;
    const isHidden = hiddenTimers[key]?.includes?.(timer.npc.name);

    return !isHidden;
  });

  useEffect(() => {
    if (socket.hasListeners("timers-create") || !connected) return;

    socket.on("timers-create", (data: Timer) => {
      queryClient.setQueryData(
        ["guild-timers", world],
        (old: AxiosResponse<Timer[]>) => {
          if (data.world !== world) return old;

          const exists = old?.data.find(
            (timer) => timer.npc.id === data.npc.id
          );

          if (exists) {
            return {
              data: old.data.map((timer) =>
                timer.npc.id === data.npc.id ? data : timer
              ),
            };
          }
          return {
            data: [...old.data, data],
          };
        }
      );
    });
  }, [connected]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const width = entry.contentRect.width;
        const breakpoints = [220, 380, 540, 800];

        const newColumns = breakpoints.reduce((acc, breakpoint) => {
          return width >= breakpoint ? acc + 1 : acc;
        }, 0);
        setColumns(newColumns || 1);
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [open]);

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
          className="ll-h-full ll-flex ll-flex-1 ll-flex-col ll-box-border ll-pt-1"
        >
          <ScrollArea className="ll-h-full ll-py-1" type="scroll">
            <span
              className="ll-grid ll-gap-0.5 ll-box-border"
              style={{
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
              }}
            >
              {filtered?.length === 0 && (
                <div className="ll-text-white ll-w-full ll-flex ll-justify-center">
                  ----
                </div>
              )}
              {filtered?.map((timer) => (
                <SingleTimer key={timer.npc.id} timer={timer} />
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
