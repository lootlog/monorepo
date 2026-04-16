import { useMutation } from "@tanstack/react-query";
import { cancelPartyGathering } from "@/api";
import {
  getAggregateActionStatus,
  startLoggedAction,
} from "@/lib/logs/log-actions";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";

export const useCancelPartyGathering = () => {
  const setOpen = useWindowsStore((s) => s.setOpen);

  return useMutation({
    mutationKey: ["cancel-party-gathering"],
    mutationFn: async () => {
      const { partyGathering, chatMessageIds, clearPartyFinder } =
        usePartyFinderStore.getState();

      if (!partyGathering) {
        throw new Error("No active party gathering");
      }

      const action = startLoggedAction({
        actionType: "cancel_party_gathering",
        payload: {
          partyGathering,
          chatMessageIds,
        },
      });
      const response = await cancelPartyGathering({
        partyGathering,
        chatMessageIds,
        action,
      });

      action.complete({
        status: getAggregateActionStatus(
          response.requestSummary.successCount,
          response.requestSummary.failureCount,
        ),
        details: {
          endpoint: "/messaging/party-gathering/:notificationId",
          totalRequests: response.requestSummary.totalRequests,
          successCount: response.requestSummary.successCount,
          failureCount: response.requestSummary.failureCount,
          guildIds: response.guildIds,
        },
      });

      clearPartyFinder();

      return response;
    },
    onSuccess: () => {
      setOpen("party-finder", false);
      window.message("Zbieranie grupy zakończone");
    },
    onError: (error) => {
      console.error("Failed to cancel party gathering:", error);
      window.message("Nie udało się zakończyć zbierania grupy");
    },
  });
};
