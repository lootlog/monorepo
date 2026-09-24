import {
  decodePartyReadyRoomClientUpdate,
  type PartyReadyRoomOrganizerProjection,
  type PartyReadyRoomParticipant,
} from "@lootlog/schema/party-ready-room";
import { Plus, UserMinus, UserPlus } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { CharacterTile } from "@/components/character-tile";
import { Button } from "@/components/ui/button";
import { Tile } from "@/components/ui/tile";
import { useReadyRoomInvitations } from "@/features/party-finder/hooks/use-ready-room-invitations";
import { partyReadyRoomControllerRemove } from "@lootlog/client/main";
import { cn } from "cn";
import { useFriendsStore } from "@/store/friends.store";
import { useReadyRoomsCache } from "@/features/party-finder/hooks/use-ready-rooms-cache";
import { inviteCharacterToFriends } from "@/lib/margonem-runtime/adapters/character-action-runtime-adapter";

type ReadyRoomParticipantItemProps = {
  room: PartyReadyRoomOrganizerProjection;
  participant: PartyReadyRoomParticipant;
};

export function ReadyRoomParticipantItem({
  room,
  participant,
}: ReadyRoomParticipantItemProps) {
  const { t } = useTranslation(["partyFinder", "chat"]);
  const { applyUpdate } = useReadyRoomsCache();

  const isFriend = useFriendsStore((state) =>
    state.isFriend(participant.character.characterId),
  );

  const { inviteParticipants, canInviteParticipants } =
    useReadyRoomInvitations();

  const sameClan =
    participant.character.clan?.id !== undefined &&
    room.organizerCharacter.clan?.id !== undefined &&
    participant.character.clan.id === room.organizerCharacter.clan.id;

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

  return (
    <Tile
      className={cn(
        "ll:mb-1 ll:flex ll:items-center ll:justify-between ll:border-gray-700 ll:bg-gray-950/50 ll:px-1.5 ll:py-1",
        (sameClan || isFriend) && "ll:border-green-500/70",
      )}
    >
      <div className="ll:flex ll:min-w-0 ll:items-center ll:gap-1">
        <CharacterTile
          character={participant.character}
          className="ll:max-h-7 ll:scale-75"
        />
        <div className="ll:max-w-28 ll:truncate ll:text-[11px] ll:font-semibold ll:text-gray-100">
          {participant.character.nick} ({participant.character.lvl}
          {participant.character.prof})
        </div>
      </div>
      <div className="ll:flex ll:items-center ll:gap-0.5">
        {!isFriend && !sameClan ? (
          <Button
            variant="secondary"
            size="xs"
            className="ll:p-0"
            title={t("actions.addFriend")}
            onClick={() => inviteCharacterToFriends(participant.character.nick)}
          >
            <UserPlus size={17} className="ll:text-blue-400" />
          </Button>
        ) : null}
        {participant.partyPresence === "OUTSIDE" ? (
          <Button
            variant="secondary"
            size="xs"
            className="ll:p-0"
            title={t("actions.invite")}
            disabled={!canInviteParticipants([participant.participantId])}
            onClick={() => {
              void inviteParticipants([participant.participantId]).catch(() => {
                toast.error(t("gatherings.inviteFailed", { ns: "chat" }));
              });
            }}
          >
            <Plus size={17} className="ll:text-green-400" />
          </Button>
        ) : null}
        <Button
          variant="secondary"
          size="xs"
          className="ll:p-0"
          title={t("actions.remove")}
          disabled={isRemoving}
          onClick={() => removeParticipant()}
        >
          <UserMinus size={17} className="ll:text-red-400" />
        </Button>
      </div>
    </Tile>
  );
}
