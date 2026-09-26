import {
  decodePartyReadyRoomClientUpdate,
  type PartyReadyRoomOrganizerProjection,
  type PartyReadyRoomParticipant,
} from "@lootlog/schema/party-ready-room";
import { Plus, UserMinus, UserPlus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "cn";
import { CharacterTile } from "@/components/character-tile";
import { ListRow } from "@/components/list-row";
import { PlayerName } from "@/components/player-name";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  openContextMenuOnKeyDown,
} from "@/components/ui/context-menu";
import { IconButton } from "@/components/ui/icon-button";
import { useReadyRoomInvitations } from "@/features/party-finder/hooks/use-ready-room-invitations";
import { partyReadyRoomControllerRemove } from "@lootlog/client/main";
import { usePlayerRelations } from "@/hooks/use-player-relations";
import { PLAYER_RELATION_FILLS } from "@/lib/player-relation";
import { useReadyRoomsCache } from "@/features/party-finder/hooks/use-ready-rooms-cache";
import { inviteCharacterToFriends } from "@/lib/margonem-runtime/adapters/character-action-runtime-adapter";

type ReadyRoomParticipantItemProps = {
  room: PartyReadyRoomOrganizerProjection;
  participant: PartyReadyRoomParticipant;
  isAlternateRow: boolean;
};

/**
 * One applicant waiting outside the party, painted like an online player row:
 * inviting is the row's own action (the button or a double-click), the rest
 * sits in its context menu.
 */
export function ReadyRoomParticipantItem({
  room,
  participant,
  isAlternateRow,
}: ReadyRoomParticipantItemProps) {
  const { t } = useTranslation(["partyFinder", "chat"]);
  const { applyUpdate } = useReadyRoomsCache();
  const { character } = participant;

  const { inviteParticipants, canInviteParticipants } =
    useReadyRoomInvitations();

  const relations = usePlayerRelations({
    characterId: character.characterId,
    clanId: character.clan?.id,
  });

  const [relation] = relations;
  const canAddFriend = relation !== "self" && !relations.includes("friend");

  const { mutate: removeParticipant, isPending: isRemoving } = useMutation({
    mutationFn: () =>
      partyReadyRoomControllerRemove(
        { notificationId: room.notificationId },
        {
          participantId: participant.participantId,
          expectedRevision: room.revision,
        },
      ),
    onSuccess: (update) => {
      applyUpdate(decodePartyReadyRoomClientUpdate(update));
    },
    onError: () => {
      toast.error(t("messages.removeFailed"));
    },
  });

  const canInvite = canInviteParticipants([participant.participantId]);

  const invite = () => {
    if (!canInvite) return;

    void inviteParticipants([participant.participantId]).catch(() => {
      toast.error(t("gatherings.inviteFailed", { ns: "chat" }));
    });
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger
        asChild
        tabIndex={0}
        onKeyDown={openContextMenuOnKeyDown}
      >
        <span className="ll:block ll:w-full ll:outline-none ll:focus-visible:outline-2 ll:focus-visible:-outline-offset-2 ll:focus-visible:outline-ring">
          <ListRow
            className={cn("ll:justify-between", isRemoving && "ll:opacity-50")}
            fill={relation ? PLAYER_RELATION_FILLS[relation] : undefined}
            isAlternateRow={isAlternateRow}
            onDoubleClick={invite}
          >
            <span className="ll:flex ll:min-w-0 ll:items-center ll:gap-0.5">
              <CharacterTile
                character={character}
                className="ll:scale-75 ll:max-h-6 ll:-ml-1.5 ll:-mr-1 ll:shrink-0"
              />
              <PlayerName
                className="ll:text-[11px] ll:text-white"
                name={character.nick}
                level={character.lvl}
                profession={character.prof}
                clanName={character.clan?.name}
              />
            </span>
            <IconButton
              label={t("actions.invite")}
              disabled={!canInvite}
              onClick={invite}
              onDoubleClick={(event) => event.stopPropagation()}
            >
              <Plus aria-hidden="true" className="ll:text-green-300" />
            </IconButton>
          </ListRow>
        </span>
      </ContextMenuTrigger>
      <ContextMenuContent className="ll:w-44 ll:flex ll:flex-col">
        {canAddFriend ? (
          <ContextMenuItem
            onClick={() => inviteCharacterToFriends(character.nick)}
          >
            <UserPlus
              aria-hidden="true"
              strokeWidth={1.5}
              className="ll:mr-2 ll:size-3.5 ll:shrink-0"
            />
            {t("actions.addFriend")}
          </ContextMenuItem>
        ) : null}
        <ContextMenuItem
          className="ll:text-red-300 ll:hover:bg-red-500/20 ll:data-[highlighted]:bg-red-500/20 ll:focus-visible:bg-red-500/20"
          disabled={isRemoving}
          onClick={() => removeParticipant()}
        >
          <UserMinus
            aria-hidden="true"
            strokeWidth={1.5}
            className="ll:mr-2 ll:size-3.5 ll:shrink-0"
          />
          {t("actions.remove")}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
