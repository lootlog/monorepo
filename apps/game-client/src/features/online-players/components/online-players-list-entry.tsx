import { CharacterTile } from "@/components/character-tile";
import { Tile } from "@/components/ui/tile";
import { PlayerPresence } from "@/features/online-players/hooks/use-players-presence";
import { MargonemCharacter } from "@/hooks/api/use-character-list";
import { useGuildMembers } from "@/hooks/api/use-guild-members";
import { cn } from "@/lib/utils";
import { FC } from "react";

export type OnlinePlayersListEntryProps = {
  discordId: string;
  presences: PlayerPresence[];
  guildId?: string;
};

export const OnlinePlayersListEntry: FC<OnlinePlayersListEntryProps> = ({
  discordId,
  presences,
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

  const guildMember = guildMembers?.[discordId];
  const roleWithTopPosition = guildMember?.roles.sort(
    (a, b) => b.position - a.position
  );
  const roleColor = roleWithTopPosition?.[0]?.color;
  const color = roleColor === 0 ? "FFF" : roleColor?.toString(16);

  return (
    <Tile className="ll-px-2 ll-flex ll-flex-row ll-justify-between ll-mb-1">
      <div
        className={cn(
          "ll-font-semibold ll-text-xs ll-min-w-16 ll-max-w-32 ll-whitespace-nowrap ll-truncate"
        )}
        style={{ color: `#${color}` }}
      >
        ({presences.length}) {guildMember?.name}
      </div>
      <span className="ll-flex ll-flex-row ll-flex-wrap ll-justify-end -ll-mr-2">
        {presences.map((presence) => (
          <CharacterTile
            key={`${presence.player?.accountId}-${presence.player?.characterId}`}
            character={getCharacterData(presence)}
            className="ll-scale-75 ll-max-h-7 -ll-mt-1 -ll-ml-1.5"
          />
        ))}
      </span>
    </Tile>
  );
};
