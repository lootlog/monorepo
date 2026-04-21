import { CharacterTile } from "@/components/character-tile";
import { Tile } from "@/components/ui/tile";
import type { MargonemCharacter } from "@/api/characters.api";
import type { PlayerPresence } from "@/features/online-players/hooks/use-players-presence";
import { cn } from "@/lib/utils";
import type { FC } from "react";
import { useMemberColor } from "@/hooks/discord/use-member-color";
import { getFixedT } from "@/i18n/get-fixed-t";
import type { MemberSummaryResponseDtoOutput } from "@/lib/api/generated/main/model";

type OnlinePlayersListEntryProps = {
  presences: PlayerPresence[];
  guildMember?: MemberSummaryResponseDtoOutput;
};

const getCharacterData = (presence: PlayerPresence): MargonemCharacter => {
  const t = getFixedT("common");

  return {
    id: presence.player?.characterId
      ? Number.parseInt(presence.player?.characterId, 10)
      : 0,
    nick: presence.player?.name || t("states.unknownNeutral"),
    icon: presence.player?.icon || "",
    lvl: presence.player?.lvl || 0,
    prof: presence.player?.prof || t("states.unknownNeutral"),
    world: presence.player?.world || t("states.unknownNeutral"),
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
