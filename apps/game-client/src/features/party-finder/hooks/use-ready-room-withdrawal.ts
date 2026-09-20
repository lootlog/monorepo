import {
  decodePartyReadyRoomClientUpdate,
  type PartyReadyRoomProjection,
} from "@lootlog/schema/party-ready-room";
import { useMutation } from "@tanstack/react-query";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { partyReadyRoomControllerWithdraw } from "@lootlog/client/main";
import { selectReadyRoomParticipantForCharacter } from "@/features/party-finder/ready-room-cache";
import { useReadyRoomsCache } from "@/features/party-finder/hooks/use-ready-rooms-cache";

export const useReadyRoomWithdrawal = (
  room: PartyReadyRoomProjection | null,
) => {
  const participant = room
    ? selectReadyRoomParticipantForCharacter(
        room,
        getCurrentReadyRoomCharacterIdentity(),
      )
    : null;

  const { applyUpdate } = useReadyRoomsCache();

  const { mutateAsync, isPending: isWithdrawing } = useMutation({
    mutationFn: ({
      notificationId,
      participantId,
    }: {
      notificationId: string;
      participantId: string;
    }) =>
      partyReadyRoomControllerWithdraw({ notificationId }, { participantId }),
    onSuccess: (update) => {
      applyUpdate(decodePartyReadyRoomClientUpdate(update));
    },
  });

  const withdraw = () => {
    if (!room || !participant || isWithdrawing) return;

    return mutateAsync({
      notificationId: room.notificationId,
      participantId: participant.participantId,
    });
  };

  return { isWithdrawing, participant, withdraw };
};
