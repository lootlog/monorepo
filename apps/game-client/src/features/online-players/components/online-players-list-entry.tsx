import { CharacterTile } from "@/components/character-tile";
import { Tile } from "@/components/ui/tile";
import type { PlayerPresence } from "@/lib/online-players-presence";
import { getPresenceCharacter } from "@/features/online-players/online-players-list.helpers";
import { cn } from "@/lib/utils";
import type { FC } from "react";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import type { MemberSummaryResponseDtoOutput } from "@/lib/api/generated/main/model";

type OnlinePlayersListEntryProps = {
  presences: PlayerPresence[];
  guildMember?: MemberSummaryResponseDtoOutput;
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
            character={getPresenceCharacter(presence)}
            isAfk={presence.isAfk}
            className="ll:scale-75 ll:max-h-6 ll:-mt-1 ll:-ml-2"
          />
        ))}
      </span>
    </Tile>
  );
};
