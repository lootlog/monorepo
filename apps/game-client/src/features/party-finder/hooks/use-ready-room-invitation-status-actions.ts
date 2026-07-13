import type { PartyReadyRoomProjection } from "@lootlog/types";
import { useState } from "react";
import {
  partyReadyRoomControllerAnnotateInvitation,
  partyReadyRoomControllerReconcileInvitation,
} from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import {
  selectOwnedReadyRoom,
  usePartyFinderStore,
} from "@/store/party-finder.store";

export function useReadyRoomInvitationStatusActions() {
  const [isUpdatingInvitation, setIsUpdatingInvitation] = useState(false);

  const getOwnedReadyRoom = () => {
    const state = usePartyFinderStore.getState();
    const ownedReadyRoom = selectOwnedReadyRoom(state);
    if (!ownedReadyRoom) throw new Error("No active party Ready Room");
    return { state, ownedReadyRoom };
  };

  const annotateInvitation = async (
    participantId: string,
    outcome: "SENT" | "FAILED",
  ) => {
    const { state, ownedReadyRoom } = getOwnedReadyRoom();
    setIsUpdatingInvitation(true);
    try {
      const projection = await partyReadyRoomControllerAnnotateInvitation(
        { notificationId: ownedReadyRoom.notificationId },
        {
          participantId,
          expectedRevision: ownedReadyRoom.revision,
          outcome,
        },
      );
      state.mergeProjection(projection as unknown as PartyReadyRoomProjection);
    } finally {
      setIsUpdatingInvitation(false);
    }
  };

  const reconcileInvitation = async (
    participantId: string,
    commandId: string,
    outcome: "NOT_MARKED" | "SENT" | "FAILED",
  ) => {
    const { state, ownedReadyRoom } = getOwnedReadyRoom();
    setIsUpdatingInvitation(true);
    try {
      const projection = await partyReadyRoomControllerReconcileInvitation(
        { notificationId: ownedReadyRoom.notificationId },
        {
          participantId,
          commandId,
          expectedRevision: ownedReadyRoom.revision,
          outcome,
        },
      );
      state.mergeProjection(projection as unknown as PartyReadyRoomProjection);
    } finally {
      setIsUpdatingInvitation(false);
    }
  };

  return {
    annotateInvitation,
    reconcileInvitation,
    isUpdatingInvitation,
  };
}
