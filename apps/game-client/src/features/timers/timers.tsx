import { DraggableWindow } from "@/components/draggable-window";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SingleTimer } from "@/features/timers/components/single-timer";
import { TimerTile } from "@/features/timers/components/timer-tile";
import { Timer, useTimers } from "@/hooks/api/use-timers";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useGlobalStore } from "@/store/global.store";
import { useWindowsStore } from "@/store/windows.store";
import { useQueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { PlusIcon } from "lucide-react";
import { useEffect } from "react";

export const Timers = () => {
  const {
    timers: { open },
    setOpen,
  } = useWindowsStore();

  const { world } = useGlobalStore((state) => state.gameState);

  const queryClient = useQueryClient();
  const { data: timers } = useTimers({ world });

  const { socket, connected } = useGateway();

  const sorted = timers?.sort((a, b) => {
    return (
      new Date(a.maxSpawnTime).getTime() - new Date(b.maxSpawnTime).getTime()
    );
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

  return (
    open && (
      <DraggableWindow
        id="timers"
        title="Lootlog"
        actions={
          [
            // <div
            //   className="ll-settings-button ll-custom-cursor-pointer"
            //   key="settings"
            //   onClick={() => setOpen("settings", true)}
            // />,
          ]
        }
        onClose={() => setOpen("timers", false)}
      >
        <div className="ll-pt-2">
          <div className="ll-flex ll-flex-col ll-gap-1">
            <ScrollArea
              className="ll-max-h-72 ll-py-1 ll-flex ll-items-center ll-justify-center ll-flex-col"
              type="scroll"
            >
              {sorted?.length === 0 && (
                <div className="ll-text-white ll-w-full ll-flex ll-justify-center">
                  ----
                </div>
              )}
              {sorted?.map((timer) => {
                return <SingleTimer key={timer.npc.id} timer={timer} />;
              })}
            </ScrollArea>
            <TimerTile>
              <PlusIcon color="white" height={16} width={16} />
            </TimerTile>
          </div>
        </div>
      </DraggableWindow>
    )
  );
};
