import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { cancelPartyGathering } from "./cancel-party-gathering";

export const useSilentCancelPartyGathering = () => {
  const { client } = useAuthenticatedApiClient();

  const silentCancel = async () => {
    const { partyGathering, chatMessageIds, clearPartyFinder } =
      usePartyFinderStore.getState();

    if (!partyGathering) return;

    try {
      await cancelPartyGathering({
        client,
        partyGathering,
        chatMessageIds,
      });
    } catch (error) {
      console.warn("Silent cancel failed:", error);
    } finally {
      clearPartyFinder();
    }
  };

  return silentCancel;
};
