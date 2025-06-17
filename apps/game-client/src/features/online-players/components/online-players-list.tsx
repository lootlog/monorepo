import { GuildSelector } from "@/components/guild-selector";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OnlinePlayersListEntry } from "@/features/online-players/components/online-players-list-entry";
import { usePlayersPresence } from "@/features/online-players/hooks/use-players-presence";
import { FC } from "react";
import { useLocalStorage } from "react-use";

export const OnlinePlayersList: FC = () => {
  const [selectedGuildId, setSelectedGuildId] = useLocalStorage(
    `ll-online-players-selected-guild`,
    ""
  );
  const [onlinePlayers] = usePlayersPresence(selectedGuildId);

  const onlinePlayersList = Object.entries(onlinePlayers);

  return (
    <div className="ll-h-full ll-w-full">
      <div className="ll-flex ll-flex-col ll-h-full ll-overflow-hidden">
        <div className="ll-py-1">
          <GuildSelector
            selectedGuildId={selectedGuildId}
            setSelectedGuildId={setSelectedGuildId}
          />
        </div>
        <ScrollArea className="ll-flex-1 ll-box-border" type="hover">
          {onlinePlayersList.length > 0 ? (
            onlinePlayersList.map(([discordId, presences]) => (
              <OnlinePlayersListEntry
                key={discordId}
                discordId={discordId}
                presences={presences}
                guildId={selectedGuildId}
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
