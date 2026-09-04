import { CharacterTile } from "@/components/character-tile";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Button } from "@/components/ui/button";
import { Tile } from "@/components/ui/tile";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { PlayerPresence } from "@/lib/online-players-presence";
import { getPresenceCharacter } from "@/features/online-players/online-players-list.helpers";
import { VerifiedMargonemAccountIcon } from "@/features/online-players/components/verified-margonem-account-icon";
import type { MemberSummaryResponseDtoOutput } from "@lootlog/client/main";
import { cn } from "cn";
import { useFriendsStore } from "@/store/friends.store";
import { usePartyStore } from "@/store/party.store";
import { useGameStore } from "@/store/game.store";
import {
  inviteCharacterToFriends,
  inviteCharacterToParty,
  showCharacterEquipment,
  showCharacterProfile,
} from "@/lib/margonem-runtime/adapters/character-action-runtime-adapter";
import { Plus } from "lucide-react";
import type { FC } from "react";
import { useTranslation } from "react-i18next";

type OnlinePlayersAccountListEntryProps = {
  presence: PlayerPresence;
  guildMember?: MemberSummaryResponseDtoOutput;
};

const getHighlightClassName = ({
  isSelf,
  isAfk,
  isPartyMember,
  isSameClan,
}: {
  isSelf: boolean;
  isAfk: boolean;
  isPartyMember: boolean;
  isSameClan: boolean;
}) => {
  if (isSelf) {
    return "ll:border-yellow-400 ll:bg-yellow-500/10";
  }

  if (isAfk) {
    return "ll:border-orange-500 ll:bg-orange-500/10";
  }

  if (isPartyMember) {
    return "ll:border-purple-400 ll:bg-purple-500/10";
  }

  if (isSameClan) {
    return "ll:border-green-500 ll:bg-green-500/10";
  }

  return undefined;
};

const resolvePresenceDetails = (
  presence: PlayerPresence,
  unknownLocation: string,
  unknownWorld: string,
) => {
  const { player } = presence;
  return {
    accountId: player?.accountId ? Number.parseInt(player.accountId, 10) : 0,
    characterId: player?.characterId
      ? Number.parseInt(player.characterId, 10)
      : 0,
    locationName: player?.location?.map ?? presence.mapName ?? unknownLocation,
    player,
    world: player?.world ?? unknownWorld,
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

  return {
    canAddFriend: characterId > 0 && !isSelf && !isFriend,
    canInviteToParty: characterId > 0 && !isSelf && !isPartyMember,
    canShowGameContextActions: gameInterface === "ni" && canUseCharacterActions,
    isSameClan,
    isSelf,
  };
};

export const OnlinePlayersAccountListEntry: FC<
  OnlinePlayersAccountListEntryProps
> = ({ presence, guildMember }) => {
  const { t } = useTranslation("onlinePlayers");
  const character = getPresenceCharacter(presence);
  const { accountId, characterId, locationName, player, world } =
    resolvePresenceDetails(presence, t("location.unknown"), t("world.unknown"));
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
  const highlightClassName = getHighlightClassName({
    isSelf,
    isAfk: presence.isAfk,
    isPartyMember,
    isSameClan,
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
        <ContextMenuTrigger asChild>
          <TooltipTrigger asChild>
            <span className="ll:block ll:w-full">
              <Tile
                className={cn(
                  "ll:px-1 ll:flex-row ll:items-center ll:justify-between ll:gap-1 ll:mb-0.5",
                  highlightClassName,
                )}
                onDoubleClick={handleDoubleClick}
              >
                <span className="ll:flex ll:min-w-0 ll:items-start ll:gap-1">
                  <CharacterTile
                    character={character}
                    isAfk={presence.isAfk}
                    className="ll:scale-65 ll:-my-2 ll:-ml-1 ll:-mr-1 ll:shrink-0"
                  />
                  <span className="ll:flex ll:min-w-0 ll:flex-col ll:py-0.5 ll:leading-tight">
                    <span className="ll:flex ll:min-w-0 ll:items-center ll:gap-1 ll:text-[11px] ll:font-semibold ll:text-gray-100">
                      <span className="ll:truncate">
                        {player?.name || t("player.unknown")} ({character.lvl}
                        {character.prof})
                      </span>
                      {presence.margonemAccountVerified ? (
                        <VerifiedMargonemAccountIcon className="ll:shrink-0" />
                      ) : null}
                    </span>
                    <span className="ll:text-[10px] ll:text-gray-400 ll:truncate">
                      {visibleLocationName} • {world}
                    </span>
                  </span>
                </span>
                {canInviteToParty ? (
                  <Button
                    type="button"
                    className="ll:h-5 ll:min-w-5 ll:w-5 ll:p-0 ll:shrink-0"
                    onClick={handleInviteToParty}
                    onDoubleClick={(event) => event.stopPropagation()}
                    title={t("actions.inviteParty")}
                  >
                    <Plus size="16" className="ll:text-green-500" />
                  </Button>
                ) : null}
              </Tile>
            </span>
          </TooltipTrigger>
        </ContextMenuTrigger>
        <TooltipContent side="top">
          <span className="ll:flex ll:flex-col ll:gap-0.5">
            <span>{memberName}</span>
            {canInviteToParty ? (
              <span className="ll:text-gray-300">
                {t("actions.doubleClickInviteParty")}
              </span>
            ) : null}
          </span>
        </TooltipContent>
      </Tooltip>
      {canShowGameContextActions || canAddFriend ? (
        <ContextMenuContent className="ll:w-44 ll:flex ll:flex-col">
          {canShowGameContextActions ? (
            <>
              <ContextMenuItem onClick={handleShowProfile}>
                {t("contextMenu.showProfile")}
              </ContextMenuItem>
              <ContextMenuItem onClick={handleShowEquipment}>
                {t("contextMenu.showEquipment")}
              </ContextMenuItem>
            </>
          ) : null}
          {canAddFriend ? (
            <ContextMenuItem onClick={handleAddFriend}>
              {t("contextMenu.addFriend")}
            </ContextMenuItem>
          ) : null}
        </ContextMenuContent>
      ) : null}
    </ContextMenu>
  );
};
