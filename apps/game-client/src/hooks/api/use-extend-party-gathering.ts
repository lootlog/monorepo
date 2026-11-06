import { useMutation, useQueryClient } from "@tanstack/react-query";
import { partyReadyRoomControllerExtend } from "@lootlog/client/main";
import { decodePartyReadyRoomProjection } from "@lootlog/schema/party-ready-room";
import { ACTIVE_GATHERINGS_QUERY_KEY } from "@/features/chat/hooks/use-active-party-gatherings";
import { selectOwnedReadyRoom } from "@/features/party-finder/ready-room-cache";
import { readReadyRoomCache } from "@/features/party-finder/hooks/use-ready-rooms";
import { useReadyRoomsCache } from "@/features/party-finder/hooks/use-ready-rooms-cache";
import { getFixedT } from "@/i18n/get-fixed-t";
import { showRuntimeMessage } from "@/lib/margonem-runtime/adapters/legacy-ui-runtime-adapter";

/** Restarts the organizer's gathering lifetime. */
export const useExtendPartyGathering = () => {
  const t = getFixedT("partyFinder");
  const queryClient = useQueryClient();
  const { mergeProjection } = useReadyRoomsCache();

  return useMutation({
    mutationKey: ["extend-party-gathering"],
    mutationFn: async () => {
      const room = selectOwnedReadyRoom(readReadyRoomCache(queryClient));

      if (!room) throw new Error("No active party gathering");

      mergeProjection(
        decodePartyReadyRoomProjection(
          await partyReadyRoomControllerExtend(
            { notificationId: room.notificationId },
            { expectedRevision: room.revision },
          ),
        ),
      );
      void queryClient.invalidateQueries({
        queryKey: ACTIVE_GATHERINGS_QUERY_KEY,
      });
    },
    onError: (error) => {
      console.warn("Failed to extend party gathering:", error);
      showRuntimeMessage(t("messages.extendFailed"));
    },
  });
};
