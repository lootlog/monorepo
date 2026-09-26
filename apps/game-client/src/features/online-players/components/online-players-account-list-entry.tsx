import { CharacterTile } from "@/components/character-tile";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  openContextMenuOnKeyDown,
} from "@/components/ui/context-menu";
import { IconButton } from "@/components/ui/icon-button";
import { ListRow } from "@/components/list-row";
import { PlayerName } from "@/components/player-name";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PlayerPresence } from "@/lib/online-players-presence";
import { getPresenceCharacter } from "@/features/online-players/online-players-list.helpers";
import { OnlinePlayerTooltip } from "@/features/online-players/components/online-player-tooltip";
import { usePlayerRelations } from "@/hooks/use-player-relations";
import {
  PLAYER_AFK_FILL,
  PLAYER_RELATION_FILLS,
  type PlayerRelation,
} from "@/lib/player-relation";
import type { MemberSummaryResponseDtoOutput } from "@lootlog/client/main";
import { useGameStore } from "@/store/game.store";
import {
  inviteCharacterToFriends,
  inviteCharacterToParty,
  showCharacterEquipment,
  showCharacterProfile,
} from "@/lib/margonem-runtime/adapters/character-action-runtime-adapter";
import { Plus, Shirt, UserPlus, UserRound } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type OnlinePlayersAccountListEntryProps = {
  presence: PlayerPresence;
  guildMember?: MemberSummaryResponseDtoOutput;
};

/** Your own row and AFK players keep their colour over any relation. */
const getHighlightFill = (
  relation: PlayerRelation | undefined,
  isAfk: boolean,
) => {
  if (relation === "self") return PLAYER_RELATION_FILLS.self;

  if (isAfk) return PLAYER_AFK_FILL;

  return relation ? PLAYER_RELATION_FILLS[relation] : undefined;
};

const resolvePresenceDetails = (
  presence: PlayerPresence,
  unknownLocation: string,
) => {
  const { player } = presence;

  return {
    accountId: player?.accountId ? Number.parseInt(player.accountId, 10) : 0,
    characterId: player?.characterId
      ? Number.parseInt(player.characterId, 10)
      : 0,
    locationName: player?.location?.map ?? presence.mapName ?? unknownLocation,
    player,
    relatedPlayer: {
      characterId: player?.characterId ?? "",
      clanId: player?.clan?.id,
      name: player?.name,
    },
  };
};

type OnlinePlayerActionStateInput = {
  accountId: number;
  characterId: number;
  gameInterface?: string;
  isFriend: boolean;
  isPartyMember: boolean;
  isSelf: boolean;
};

const resolveOnlinePlayerActionState = ({
  accountId,
  characterId,
  gameInterface,
  isFriend,
  isPartyMember,
  isSelf,
}: OnlinePlayerActionStateInput) => {
  const canUseCharacterActions = characterId > 0 && accountId > 0;
  const canAddFriend = characterId > 0 && !isSelf && !isFriend;

  const canShowGameContextActions =
    gameInterface === "ni" && canUseCharacterActions;

  return {
    canAddFriend,
    canInviteToParty: characterId > 0 && !isSelf && !isPartyMember,
    canShowGameContextActions,
    hasContextActions: canShowGameContextActions || canAddFriend,
  };
};

export const OnlinePlayersAccountListEntry: FC<
  OnlinePlayersAccountListEntryProps
> = ({ presence, guildMember }) => {
  const { t } = useTranslation("onlinePlayers");
  const character = getPresenceCharacter(presence);

  const { accountId, characterId, locationName, player, relatedPlayer } =
    resolvePresenceDetails(presence, t("location.unknown"));

  const currentMapName = useGameStore((state) => state.game?.map.name);
  const gameInterface = useGameStore((state) => state.game?.interface);

  const relations = usePlayerRelations(relatedPlayer);

  const [relation] = relations;
  const isSelf = relation === "self";
  const isFriend = relations.includes("friend");

  const {
    canAddFriend,
    canInviteToParty,
    canShowGameContextActions,
    hasContextActions,
  } = resolveOnlinePlayerActionState({
    accountId,
    characterId,
    gameInterface,
    isFriend,
    isPartyMember: relations.includes("party"),
    isSelf,
  });

  const visibleLocationName =
    isSelf && !player?.location?.map && !presence.mapName && currentMapName
      ? currentMapName
      : locationName;

  const memberName = guildMember?.name ?? t("member.unknown");

  const handleInviteToParty = () => {
    inviteCharacterToParty(characterId);
  };

  const handleDoubleClick = () => {
    if (!canInviteToParty) return;

    handleInviteToParty();
  };

  const handleAddFriend = () => {
    inviteCharacterToFriends(character.nick);
  };

  const handleShowEquipment = () => {
    showCharacterEquipment({
      ...character,
      id: characterId,
      account: accountId,
    });
  };

  const handleShowProfile = () => {
    showCharacterProfile({
      accountId,
      characterId,
    });
  };

  return (
    <ContextMenu>
      <Tooltip>
        <ContextMenuTrigger
          asChild
          tabIndex={0}
          onKeyDown={openContextMenuOnKeyDown}
        >
          <TooltipTrigger asChild>
            <span className="ll:block ll:w-full ll:outline-none ll:focus-visible:outline-2 ll:focus-visible:-outline-offset-2 ll:focus-visible:outline-ring">
              <ListRow
                className="ll:justify-between ll:py-0.5"
                fill={getHighlightFill(relation, presence.isAfk)}
                onDoubleClick={handleDoubleClick}
              >
                <span className="ll:flex ll:min-w-0 ll:items-start ll:gap-1">
                  <CharacterTile
                    character={character}
                    isAfk={presence.isAfk}
                    className="ll:scale-65 ll:-my-2 ll:-ml-1 ll:-mr-1 ll:shrink-0"
                  />
                  <span className="ll:flex ll:min-w-0 ll:flex-col ll:py-0.5 ll:leading-tight">
                    <PlayerName
                      className="ll:text-[11px] ll:text-white"
                      name={player?.name || t("player.unknown")}
                      level={character.lvl}
                      profession={character.prof}
                      clanName={player?.clan?.name}
                    />
                    <span className="ll:truncate ll:text-[10px] ll:font-normal ll:text-white/65">
                      {visibleLocationName}
                    </span>
                  </span>
                </span>
                <span className="ll:flex ll:shrink-0 ll:items-center">
                  {canInviteToParty ? (
                    <IconButton
                      label={t("actions.inviteParty")}
                      onClick={handleInviteToParty}
                      onDoubleClick={(event) => event.stopPropagation()}
                    >
                      <Plus aria-hidden="true" className="ll:text-green-300" />
                    </IconButton>
                  ) : null}
                </span>
              </ListRow>
            </span>
          </TooltipTrigger>
        </ContextMenuTrigger>
        <TooltipContent className="ll:max-w-64">
          <OnlinePlayerTooltip
            canInviteToParty={canInviteToParty}
            locationName={visibleLocationName}
            memberName={memberName}
            presence={presence}
            relations={relations}
          />
        </TooltipContent>
      </Tooltip>
      {hasContextActions ? (
        <ContextMenuContent className="ll:w-44 ll:flex ll:flex-col">
          {canShowGameContextActions ? (
            <>
              <ContextMenuItem onClick={handleShowProfile}>
                <UserRound
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="ll:mr-2 ll:size-3.5 ll:shrink-0"
                />
                {t("contextMenu.showProfile")}
              </ContextMenuItem>
              <ContextMenuItem onClick={handleShowEquipment}>
                <Shirt
                  aria-hidden="true"
                  strokeWidth={1.5}
                  className="ll:mr-2 ll:size-3.5 ll:shrink-0"
                />
                {t("contextMenu.showEquipment")}
              </ContextMenuItem>
            </>
          ) : null}
          {canAddFriend ? (
            <ContextMenuItem onClick={handleAddFriend}>
              <UserPlus
                aria-hidden="true"
                strokeWidth={1.5}
                className="ll:mr-2 ll:size-3.5 ll:shrink-0"
              />
              {t("contextMenu.addFriend")}
            </ContextMenuItem>
          ) : null}
        </ContextMenuContent>
      ) : null}
    </ContextMenu>
  );
};
