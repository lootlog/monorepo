import { DraggableWindow } from "@/components/draggable-window";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useGlobalContext } from "@/contexts/global-context";
import { SingleTimer } from "@/features/timers/components/single-timer";
import { TimerTile } from "@/features/timers/components/timer-tile";
import { Timer, useTimers } from "@/hooks/api/use-timers";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useQueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { PlusIcon } from "lucide-react";
import { useEffect } from "react";

export const Timers = () => {
  const {
    newInterface,
    lootlogWindowOpen,
    setLootlogWindowOpen,
    selectedGuild,
    setSettingsWindowOpen,
  } = useGlobalContext();

  const queryClient = useQueryClient();
  const { data: timers } = useTimers();

  const world = newInterface
    ? window.Engine?.worldConfig?.getWorldName()
    : window.g?.worldConfig?.getWorldName();
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
    lootlogWindowOpen && (
      <DraggableWindow
        id="timers"
        title="Lootlog"
        actions={[
          <div
            className="ll-settings-button ll-custom-cursor-pointer"
            key="settings"
            onClick={() => setSettingsWindowOpen(true)}
          />,
        ]}
        onClose={() => setLootlogWindowOpen(false)}
      >
        <div className="ll-pt-2">
          <div className="ll-flex ll-flex-col ll-gap-1">
            <ScrollArea className="ll-h-72 ll-py-1">
              <div className="ll-flex ll-items-center ll-flex-col ll-gap-1">
                {sorted?.length === 0 && (
                  <div className="ll-text-white">----</div>
                )}
                {sorted?.map((timer) => {
                  return (
                    <SingleTimer
                      key={timer.npc.id}
                      timer={timer}
                      guildId={selectedGuild}
                    />
                  );
                })}
              </div>
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
