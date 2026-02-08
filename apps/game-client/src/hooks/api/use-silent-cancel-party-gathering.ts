import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { usePartyFinderStore } from "@/store/party-finder.store";
import { Game } from "@/lib/game";
import axios from "axios";

export const useSilentCancelPartyGathering = () => {
  const { client } = useAuthenticatedApiClient();

  const silentCancel = async () => {
    const { partyGathering, chatMessageIds, clearPartyFinder } =
      usePartyFinderStore.getState();

    if (!partyGathering) return;

    try {
      const hasNotificationId = !!partyGathering.notificationId;

      const response = await client.delete<{
        success: boolean;
        guildIds: string[];
      }>(
        hasNotificationId
          ? `/notifications/party-gathering/${partyGathering.notificationId}`
          : "/notifications/party-gathering",
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
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 400) {
        // Expired gathering — swallow silently
      } else {
        console.warn("Silent cancel failed:", error);
      }
    } finally {
      clearPartyFinder();
    }
  };

  return silentCancel;
};
