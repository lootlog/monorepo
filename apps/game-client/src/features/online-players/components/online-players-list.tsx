import { GuildSelector } from "@/components/guild-selector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { WorldSelector } from "@/components/world-selector";
import { OnlinePlayersListEntry } from "@/features/online-players/components/online-players-list-entry";
import { usePlayersPresence } from "@/features/online-players/hooks/use-players-presence";
import { useGlobalStore } from "@/store/global.store";
import { useSettingsStore } from "@/store/settings.store";
import { FC } from "react";

export const OnlinePlayersList: FC = () => {
  const { world: defaultWorld } = useGlobalStore((state) => state.gameState);
  const { allowWorldSelection, guildId, world } = useSettingsStore();
  const [onlinePlayers] = usePlayersPresence(guildId, world || defaultWorld);

  const onlinePlayersList = Object.entries(onlinePlayers);

  return (
    <div className="ll-h-full ll-w-full">
      <div className="ll-flex ll-flex-col ll-h-full ll-overflow-hidden">
        <div className="ll-pt-1 ll-flex ll-gap-1">
          <GuildSelector />
          {allowWorldSelection && <WorldSelector className="ll-w-1/3" />}
        </div>
        <ScrollArea className="ll-flex-1 ll-box-border" type="hover">
          {onlinePlayersList.length > 0 ? (
            onlinePlayersList.map(([discordId, presences]) => (
              <OnlinePlayersListEntry
                key={discordId}
                discordId={discordId}
                presences={presences}
                guildId={guildId}
              />
            ))
          ) : (
            <p className="ll-text-gray-500 ll-w-full ll-flex ll-items-center ll-justify-center">
              Brak graczy online.
            </p>
          )}
        </ScrollArea>
      </div>
    </div>
  );
};
