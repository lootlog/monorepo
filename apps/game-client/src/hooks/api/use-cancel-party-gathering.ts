import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { cancelPartyGathering } from "./cancel-party-gathering";

export const useCancelPartyGathering = () => {
  const { client } = useAuthenticatedApiClient();
  const setOpen = useWindowsStore((s) => s.setOpen);

  return useMutation({
    mutationKey: ["cancel-party-gathering"],
    mutationFn: async () => {
      const { partyGathering, chatMessageIds, clearPartyFinder } =
        usePartyFinderStore.getState();

      if (!partyGathering) {
        throw new Error("No active party gathering");
      }

      const response = await cancelPartyGathering({
        client,
        partyGathering,
        chatMessageIds,
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
