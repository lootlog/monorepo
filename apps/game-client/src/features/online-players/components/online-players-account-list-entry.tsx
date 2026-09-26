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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PlayerPresence } from "@/lib/online-players-presence";
import { getPresenceCharacter } from "@/features/online-players/online-players-list.helpers";
import {
  OnlinePlayerTooltip,
  type OnlinePlayerRelation,
} from "@/features/online-players/components/online-player-tooltip";
import { TIMERS_COLORS } from "@/features/timers/constants/timer-colors";
import { VerifiedMargonemAccountIcon } from "@/features/online-players/components/verified-margonem-account-icon";
import type { MemberSummaryResponseDtoOutput } from "@lootlog/client/main";
import { useFriendsStore } from "@/store/friends.store";
import { usePartyStore } from "@/store/party.store";
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
  isAlternateRow?: boolean;
};

const resolveRelation = ({
  isSelf,
  isPartyMember,
  isSameClan,
}: {
  isSelf: boolean;
  isPartyMember: boolean;
  isSameClan: boolean;
}): OnlinePlayerRelation => {
  if (isSelf) return "self";

  if (isPartyMember) return "party";

  if (isSameClan) return "clan";

  return undefined;
};

/** Highlights use the timer palette, so every list paints rows alike. */
const getHighlightFill = (relation: OnlinePlayerRelation, isAfk: boolean) => {
  if (relation === "self") return TIMERS_COLORS.yellow.fill;

  if (isAfk) return TIMERS_COLORS.orange.fill;

  if (relation === "party") return TIMERS_COLORS.sky.fill;

  if (relation === "clan") return TIMERS_COLORS.green.fill;

  return undefined;
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
  };
};

type OnlinePlayerActionStateInput = {
  accountId: number;
  characterId: number;
  characterNick: string;
  gameInterface?: string;
  heroCharacterId?: string;
  heroClanId?: number;
  heroName?: string;
  isFriend: boolean;
  isPartyMember: boolean;
  playerClanId?: number;
};

const resolveOnlinePlayerActionState = ({
  accountId,
  characterId,
  characterNick,
  gameInterface,
  heroCharacterId,
  heroClanId,
  heroName,
  isFriend,
  isPartyMember,
  playerClanId,
}: OnlinePlayerActionStateInput) => {
  const isSelf =
    String(characterId) === heroCharacterId || characterNick === heroName;

  const isSameClan =
    playerClanId !== undefined &&
    heroClanId !== undefined &&
    playerClanId === heroClanId;

  const canUseCharacterActions = characterId > 0 && accountId > 0;
  const canAddFriend = characterId > 0 && !isSelf && !isFriend;

  const canShowGameContextActions =
    gameInterface === "ni" && canUseCharacterActions;

  return {
    canAddFriend,
    canInviteToParty: characterId > 0 && !isSelf && !isPartyMember,
    canShowGameContextActions,
    hasContextActions: canShowGameContextActions || canAddFriend,
    isSameClan,
    isSelf,
  };
};

export const OnlinePlayersAccountListEntry: FC<
  OnlinePlayersAccountListEntryProps
> = ({ presence, guildMember, isAlternateRow = false }) => {
  const { t } = useTranslation("onlinePlayers");
  const character = getPresenceCharacter(presence);

  const { accountId, characterId, locationName, player } =
    resolvePresenceDetails(presence, t("location.unknown"));

  const heroCharacterId = useGameStore((state) => state.game?.hero.characterId);
  const heroName = useGameStore((state) => state.game?.hero.name);
  const heroClanId = useGameStore((state) => state.game?.hero.clan?.id);
  const currentMapName = useGameStore((state) => state.game?.map.name);
  const gameInterface = useGameStore((state) => state.game?.interface);

  const isPartyMember = usePartyStore(
    (state) =>
      characterId > 0 &&
      state.members.some(
        (member) => member.characterId === String(characterId),
      ),
  );

  const isFriend = useFriendsStore((state) =>
    state.isFriend(characterId.toString()),
  );

  const {
    canAddFriend,
    canInviteToParty,
    canShowGameContextActions,
    hasContextActions,
    isSameClan,
    isSelf,
  } = resolveOnlinePlayerActionState({
    accountId,
    characterId,
    characterNick: character.nick,
    gameInterface,
    heroCharacterId,
    heroClanId,
    heroName,
    isFriend,
    isPartyMember,
    playerClanId: player?.clan?.id,
  });

  const relation = resolveRelation({ isSelf, isPartyMember, isSameClan });

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
                isAlternateRow={isAlternateRow}
                onDoubleClick={handleDoubleClick}
              >
                <span className="ll:flex ll:min-w-0 ll:items-start ll:gap-1">
                  <CharacterTile
                    character={character}
                    isAfk={presence.isAfk}
                    className="ll:scale-65 ll:-my-2 ll:-ml-1 ll:-mr-1 ll:shrink-0"
                  />
                  <span className="ll:flex ll:min-w-0 ll:flex-col ll:py-0.5 ll:leading-tight">
                    <span className="ll:flex ll:min-w-0 ll:items-center ll:gap-1 ll:text-[11px] ll:text-white">
                      <span className="ll:truncate">
                        {player?.name || t("player.unknown")} ({character.lvl}
                        {character.prof})
                      </span>
                      {presence.margonemAccountVerified ? (
                        <VerifiedMargonemAccountIcon className="ll:shrink-0" />
                      ) : null}
                    </span>
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
            isFriend={isFriend}
            locationName={visibleLocationName}
            memberName={memberName}
            presence={presence}
            relation={relation}
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
