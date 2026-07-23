import type {
  PartyReadyRoomClientUpdate,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import { useState } from "react";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { partyReadyRoomControllerWithdraw } from "@lootlog/api-client/react-query/main/party-ready-room";
import {
  selectReadyRoomParticipantForCharacter,
  usePartyFinderStore,
} from "@/store/party-finder.store";

export const useReadyRoomWithdrawal = (
  room: PartyReadyRoomProjection | null,
) => {
  const participant = room
    ? selectReadyRoomParticipantForCharacter(
        room,
        getCurrentReadyRoomCharacterIdentity(),
      )
    : null;
  const applyUpdate = usePartyFinderStore((state) => state.applyUpdate);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const withdraw = () => {
    if (!room || !participant || isWithdrawing) return;

    setIsWithdrawing(true);
    return partyReadyRoomControllerWithdraw(
      { notificationId: room.notificationId },
      { participantId: participant.participantId },
    )
      .then((update) => {
        applyUpdate(update as unknown as PartyReadyRoomClientUpdate);
      })
      .finally(() => setIsWithdrawing(false));
  };

  return { isWithdrawing, participant, withdraw };
};
