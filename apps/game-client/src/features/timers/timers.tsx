import { DraggableWindow } from "@/components/draggable-window";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGlobalContext } from "@/contexts/global-context";
import { SingleTimer } from "@/features/timers/components/single-timer";
import { TimerTile } from "@/features/timers/components/timer-tile";
import { useGuilds } from "@/hooks/api/use-guilds";
import { NpcType } from "@/hooks/api/use-npcs";
import { Timer, useTimers } from "@/hooks/api/use-timers";
import { useGateway } from "@/hooks/gateway/use-gateway";
import { useQueryClient } from "@tanstack/react-query";
import { AxiosResponse } from "axios";
import { PlusIcon } from "lucide-react";
import { useEffect } from "react";

const SORT_ORDER = [
  NpcType.TITAN,
  NpcType.COLOSSUS,
  NpcType.HERO,
  NpcType.ELITE2,
  NpcType.ELITE,
];

export const Timers = () => {
  const { data: guilds } = useGuilds();
  const {
    newInterface,
    lootlogWindowOpen,
    setLootlogWindowOpen,
    selectedGuild,
    setSelectedGuild,
    settingsWindowOpen,
    setSettingsWindowOpen,
  } = useGlobalContext();
  const queryClient = useQueryClient();
  const { data: timers } = useTimers({ guildId: selectedGuild });
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
        ["guild-timers", selectedGuild, world],
        (old: AxiosResponse<Timer[]>) => {
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
          <Select value={selectedGuild} onValueChange={setSelectedGuild}>
            <SelectTrigger className="w-[180px] ll-text-white ll-border-white ll-h-4 ll-my-1">
              <SelectValue
                placeholder="Wybierz lootlog..."
                className="ll-h-4"
              />
            </SelectTrigger>
            <SelectContent>
              {guilds?.map((guild) => {
                return (
                  <SelectItem key={guild.id} value={guild.id}>
                    {guild.name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <div>
            <div>
              <div className="ll-flex ll-flex-col ll-gap-1">
                <ScrollArea className="ll-max-h-72 ll-py-1">
                  <div className="ll-flex ll-items-center ll-flex-col">
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
          </div>
        </div>
      </DraggableWindow>
    )
  );
};
