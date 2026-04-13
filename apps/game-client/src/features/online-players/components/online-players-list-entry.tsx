import { CharacterTile } from "@/components/character-tile";
import { Tile } from "@/components/ui/tile";
import type { PlayerPresence } from "@/features/online-players/hooks/use-players-presence";
import type { MargonemCharacter } from "@/hooks/api/use-character-list";
import type { GuildMember } from "@/hooks/api/use-guild-members";
import { cn } from "@/lib/utils";
import type { FC } from "react";
import { useMemberColor } from "@/hooks/discord/use-member-color";

type OnlinePlayersListEntryProps = {
  presences: PlayerPresence[];
  guildMember?: GuildMember;
};

const getCharacterData = (presence: PlayerPresence): MargonemCharacter => {
  return {
    id: presence.player?.characterId
      ? Number.parseInt(presence.player?.characterId, 10)
      : 0,
    nick: presence.player?.name ?? "Unknown",
    icon: presence.player?.icon ?? "",
    lvl: presence.player?.lvl ?? 0,
    prof: presence.player?.prof ?? "Unknown",
    world: presence.player?.world ?? "Unknown",
  };
};

export const OnlinePlayersListEntry: FC<OnlinePlayersListEntryProps> = ({
  presences,
  guildMember,
}) => {
  const color = useMemberColor(guildMember);

  return (
    <Tile className="ll:px-1 ll:flex ll:flex-row ll:justify-between ll:mb-0.5">
      <div
        className={cn(
          "ll:font-semibold ll:text-[11px] ll:min-w-16 ll:max-w-32 ll:whitespace-nowrap ll:truncate",
        )}
        style={{ color: `#${color}` }}
      >
        ({presences.length}) {guildMember?.name}
      </div>
      <span className="ll:flex ll:flex-row ll:flex-wrap ll:justify-end ll:-mr-2">
        {presences.map((presence) => (
          <CharacterTile
            key={`${presence.player?.accountId}-${presence.player?.characterId}`}
            character={getCharacterData(presence)}
            className="ll:scale-75 ll:max-h-6 ll:-mt-1 ll:-ml-2"
          />
        ))}
      </span>
    </Tile>
  );
};
