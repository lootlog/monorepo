import { useMutation } from "@tanstack/react-query";
import type { PartyReadyRoomProjection } from "@lootlog/types";
import { partyReadyRoomControllerCancel } from "@/lib/api/generated/main/party-ready-room/party-ready-room";
import {
  selectOwnedReadyRoom,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { getFixedT } from "@/i18n/get-fixed-t";

export const useCancelPartyGathering = () => {
  const t = getFixedT("partyFinder");
  const setOpen = useWindowsStore((s) => s.setOpen);

  return useMutation({
    mutationKey: ["cancel-party-gathering"],
    mutationFn: async () => {
      const state = usePartyFinderStore.getState();
      const ownedReadyRoom = selectOwnedReadyRoom(state);

      if (!ownedReadyRoom) {
        throw new Error("No active party gathering");
      }

      const response = await partyReadyRoomControllerCancel(
        { notificationId: ownedReadyRoom.notificationId },
        { expectedRevision: ownedReadyRoom.revision },
      );
      state.mergeProjection(response as unknown as PartyReadyRoomProjection);

      return response;
    },
    onSuccess: () => {
      setOpen("party-finder", false);
      window.message(t("messages.cancelSuccess"));
    },
    onError: (error) => {
      console.warn("Failed to cancel party gathering:", error);
      window.message(t("messages.cancelFailed"));
    },
  });
};
