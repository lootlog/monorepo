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
  const [onlinePlayers, setOnlinePlayers] = usePlayersPresence(selectedGuildId);

  return (
    <div>
      <div className="ll-py-2">
        <GuildSelector
          selectedGuildId={selectedGuildId}
          setSelectedGuildId={setSelectedGuildId}
        />
      </div>
      <ScrollArea className="ll-h-full ll-w-full ll-p-2">
        {Object.entries(onlinePlayers).length > 0 ? (
          Object.entries(onlinePlayers).map(([discordId, players]) => (
            <OnlinePlayersListEntry
              discordId={discordId}
              players={players}
              guildId={selectedGuildId}
            />
          ))
        ) : (
          <p className="ll-text-gray-500">No players online.</p>
        )}
      </ScrollArea>
    </div>
  );
};
