import { cancelPartyGathering } from "@/api";
import { startLoggedAction } from "@/lib/logs/log-actions";
import { usePartyFinderStore } from "@/store/party-finder.store";

export const useSilentCancelPartyGathering = () => {
  const silentCancel = async () => {
    const { partyGathering, clearPartyFinder } = usePartyFinderStore.getState();

    if (!partyGathering) return;

    const action = startLoggedAction({
      actionType: "cancel_party_gathering",
      payload: {
        partyGathering,
        mode: "silent",
      },
    });

    try {
      await cancelPartyGathering({
        partyGathering,
        action,
      });

      action.complete({
        status: "success",
        details: {
          endpoint: "/messaging/party-gathering/:notificationId",
          mode: "silent",
        },
      });
    } catch (error) {
      action.complete({
        status: "error",
        details: {
          endpoint: "/messaging/party-gathering/:notificationId",
          mode: "silent",
        },
      });
      console.warn("Silent cancel failed:", error);
    } finally {
      clearPartyFinder();
    }
  };

  return silentCancel;
};
