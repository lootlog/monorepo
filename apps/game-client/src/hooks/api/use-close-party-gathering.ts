import type { PartyReadyRoomProjection } from "@lootlog/types";
import { useMutation } from "@tanstack/react-query";
import { partyReadyRoomControllerClose } from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import {
  selectOwnedReadyRoom,
  usePartyFinderStore,
} from "@/store/party-finder.store";

export function useClosePartyGathering() {
  return useMutation({
    mutationKey: ["close-party-gathering"],
    mutationFn: async () => {
      const state = usePartyFinderStore.getState();
      const ownedReadyRoom = selectOwnedReadyRoom(state);
      if (!ownedReadyRoom) throw new Error("No active party gathering");

      const response = await partyReadyRoomControllerClose(
        { notificationId: ownedReadyRoom.notificationId },
        { expectedRevision: ownedReadyRoom.revision },
      );
      state.mergeProjection(response as unknown as PartyReadyRoomProjection);
      return response;
    },
  });
}
