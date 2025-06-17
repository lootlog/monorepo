import { CharacterTile } from "@/components/character-tile";
import { PlayerPresence } from "@/features/online-players/hooks/use-players-presence";
import { MargonemCharacter } from "@/hooks/api/use-character-list";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { FC } from "react";

export type OnlinePlayersListEntryProps = {
  discordId: string;
  players: PlayerPresence[];
  guildId?: string;
};

export const OnlinePlayersListEntry: FC<OnlinePlayersListEntryProps> = ({
  discordId,
  players,
  guildId,
}) => {
  const { data: guildMembers } = useGuildMembers(guildId);

  const getCharacterData = (presence: PlayerPresence): MargonemCharacter => {
    return {
      id: presence.player?.characterId
        ? parseInt(presence.player?.characterId, 10)
        : 0,
      nick: presence.player?.name || "Unknown",
      icon: presence.player?.icon || "",
      lvl: presence.player?.lvl || 0,
      prof: presence.player?.prof || "Unknown",
      world: presence.player?.world || "Unknown",
    };
  };

  return (
    <div key={discordId} className="ll-mb-4">
      <h3 className="ll-text-lg ll-font-semibold ll-mb-2">
        {guildMembers?.[discordId].name}
      </h3>
      <ul className="ll-list-none ll-p-0">
        {players.map((player) => (
          <li
            key={player.sessionId}
            className="ll-flex ll-items-center ll-gap-2 ll-py-1"
          >
            <CharacterTile character={getCharacterData(player)} />
            <span className="ll-text-sm ll-font-medium">
              {player.player?.name || "Nieznany"} ({player.player?.world})
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};
