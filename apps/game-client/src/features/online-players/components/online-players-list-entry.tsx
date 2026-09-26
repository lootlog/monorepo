import { CharacterTile } from "@/components/character-tile";
import { ListRow } from "@/components/list-row";
import type { PlayerPresence } from "@/lib/online-players-presence";
import { getPresenceCharacter } from "@/features/online-players/online-players-list.helpers";
import { VerifiedMargonemAccountIcon } from "@/features/online-players/components/verified-margonem-account-icon";
import type { FC } from "react";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import type { MemberSummaryResponseDtoOutput } from "@lootlog/client/main";

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
    <ListRow className="ll:justify-between ll:py-0.5">
      <div
        className="ll:min-w-16 ll:max-w-32 ll:truncate ll:whitespace-nowrap ll:text-[11px]"
        style={{ color: `#${color}` }}
      >
        ({presences.length}) {guildMember?.name}
      </div>
      <span className="ll:flex ll:flex-row ll:flex-wrap ll:justify-end ll:-mr-2">
        {presences.map((presence) => (
          <span
            key={`${presence.player?.accountId}-${presence.player?.characterId}`}
            className="ll:relative ll:inline-flex"
          >
            <CharacterTile
              character={getPresenceCharacter(presence)}
              isAfk={presence.isAfk}
              className="ll:scale-75 ll:max-h-6 ll:-mt-1 ll:-ml-2"
            />
            {presence.margonemAccountVerified ? (
              <VerifiedMargonemAccountIcon className="ll:absolute ll:-right-0.5 ll:-top-0.5 ll:z-20 ll:size-3 ll:bg-gray-950/80" />
            ) : null}
          </span>
        ))}
      </span>
    </ListRow>
  );
};
