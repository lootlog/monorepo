import { ACTIVE_GATHERINGS_QUERY_KEY } from "@/features/chat/hooks/use-active-party-gatherings";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { decodePartyReadyRoomClientUpdate } from "@lootlog/schema/party-ready-room";
import {
  type ActivePartyGatheringSummary,
  getChatControllerGetChatMessagesQueryKey,
  partyReadyRoomControllerCancel,
} from "@lootlog/client/main";

import {
  selectOwnedReadyRoom,
  usePartyFinderStore,
} from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { getFixedT } from "@/i18n/get-fixed-t";

export const useCancelPartyGathering = () => {
  const t = getFixedT("partyFinder");
  const queryClient = useQueryClient();
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
      state.applyUpdate(decodePartyReadyRoomClientUpdate(response));
      queryClient.setQueriesData<ActivePartyGatheringSummary[]>(
        { queryKey: ACTIVE_GATHERINGS_QUERY_KEY },
        (rooms) =>
          rooms?.filter(
            (room) => room.notificationId !== ownedReadyRoom.notificationId,
          ),
      );
      void queryClient.invalidateQueries({
        queryKey: ACTIVE_GATHERINGS_QUERY_KEY,
      });
      await Promise.all(
        ownedReadyRoom.guildIds.map((guildId) =>
          queryClient.invalidateQueries({
            queryKey: getChatControllerGetChatMessagesQueryKey({ guildId }),
            exact: true,
            refetchType: "active",
          }),
        ),
      );

      return response;
    },
    onSuccess: () => {
      setOpen("party-finder", false);
      showRuntimeMessage(t("messages.cancelSuccess"));
    },
    onError: (error) => {
      console.warn("Failed to cancel party gathering:", error);
      showRuntimeMessage(t("messages.cancelFailed"));
    },
  });
};
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";
