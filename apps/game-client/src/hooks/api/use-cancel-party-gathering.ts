import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { useWindowsStore } from "@/store/windows.store";
import { Game } from "@/lib/game";

type CancelPartyGatheringResponse = {
  success: boolean;
  guildIds: string[];
};

export const useCancelPartyGathering = () => {
  const { client } = useAuthenticatedApiClient();
  const setOpen = useWindowsStore((s) => s.setOpen);

  return useMutation({
    mutationKey: ["cancel-party-gathering"],
    mutationFn: async () => {
      const { partyGathering, chatMessageIds, clearPartyFinder } =
        usePartyFinderStore.getState();

      if (!partyGathering?.notificationId) {
        throw new Error("No active party gathering");
      }

      const response = await client.delete<CancelPartyGatheringResponse>(
        `/notifications/party-gathering/${partyGathering.notificationId}`,
      );

      const guildIds = response.data.guildIds;
      const nick = Game.hero.nick;

      const updatePromises = Object.entries(chatMessageIds).map(
        ([guildId, messageId]) => {
          if (guildIds.includes(guildId)) {
            return client
              .patch(`/guilds/${guildId}/chat-messages/${messageId}`, {
                message: `${nick} zakończył zbieranie grupy`,
              })
              .catch((err) => {
                console.warn(
                  `Failed to update chat message in guild ${guildId}:`,
                  err,
                );
              });
          }
          return Promise.resolve();
        },
      );

      await Promise.allSettled(updatePromises);

      clearPartyFinder();

      return response.data;
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
