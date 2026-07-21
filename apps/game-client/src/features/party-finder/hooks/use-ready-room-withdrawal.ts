import type {
  PartyReadyRoomClientUpdate,
  PartyReadyRoomProjection,
} from "@lootlog/types";
import { useState } from "react";
import { getCurrentReadyRoomCharacterIdentity } from "@/features/party-finder/ready-room-character-identity";
import { partyReadyRoomControllerWithdraw } from "@/lib/api/generated/main/party-ready-room/party-ready-room";
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

  const withdraw = async () => {
    if (!room || !participant || isWithdrawing) return;

    setIsWithdrawing(true);
    try {
      const update = await partyReadyRoomControllerWithdraw(
        { notificationId: room.notificationId },
        { participantId: participant.participantId },
      );
      applyUpdate(update as unknown as PartyReadyRoomClientUpdate);
    } finally {
      setIsWithdrawing(false);
    }
  };

  return { isWithdrawing, participant, withdraw };
};
