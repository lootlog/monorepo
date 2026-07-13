import type { PartyReadyRoomProjection } from "@lootlog/types";
import { useState } from "react";
import {
  partyReadyRoomControllerAcknowledgeInvitation,
  partyReadyRoomControllerReserveInvitations,
} from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import {
  selectOwnedReadyRoom,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { inviteCharacterToParty } from "@/utils/game/character-actions";

export function useReadyRoomInvitations() {
  const [isInviting, setIsInviting] = useState(false);

  const inviteParticipants = async (participantDiscordIds: string[]) => {
    const state = usePartyFinderStore.getState();
    const ownedReadyRoom = selectOwnedReadyRoom(state);
    if (!ownedReadyRoom) throw new Error("No active party Ready Room");

    setIsInviting(true);
    try {
      const reservation = await partyReadyRoomControllerReserveInvitations(
        { notificationId: ownedReadyRoom.notificationId },
        {
          expectedRevision: ownedReadyRoom.revision,
          participantDiscordIds,
        },
      );
      state.mergeProjection(
        reservation.projection as unknown as PartyReadyRoomProjection,
      );

      await Promise.all(
        reservation.batch.reservations.map(async (target) => {
          let outcome: "SENT" | "FAILED" = "SENT";
          try {
            inviteCharacterToParty(target.characterId);
          } catch {
            outcome = "FAILED";
          }

          try {
            const projection =
              await partyReadyRoomControllerAcknowledgeInvitation(
                { notificationId: ownedReadyRoom.notificationId },
                {
                  participantDiscordId: target.participantDiscordId,
                  commandId: target.commandId,
                  outcome,
                },
              );
            state.mergeProjection(
              projection as unknown as PartyReadyRoomProjection,
            );
          } catch (error) {
            console.warn(
              "Failed to acknowledge a party invitation command",
              error,
            );
          }
        }),
      );

      return reservation.batch;
    } finally {
      setIsInviting(false);
    }
  };

  return { inviteParticipants, isInviting };
}
