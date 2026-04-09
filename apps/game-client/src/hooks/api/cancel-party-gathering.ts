import type { AxiosInstance } from "axios";
import { Game } from "@/lib/game";
import type { PartyGatheringSession } from "@/store/party-finder.store";

type CancelPartyGatheringResponse = {
  success: boolean;
  guildIds: string[];
};

type CancelPartyGatheringOptions = {
  client: AxiosInstance;
  partyGathering: PartyGatheringSession;
  chatMessageIds: Record<string, string>;
};

const PARTY_GATHERING_ENDPOINT = "/messaging/party-gathering";

const getPartyGatheringCancellationPath = (
  notificationId: string | undefined,
) =>
  notificationId
    ? `${PARTY_GATHERING_ENDPOINT}/${notificationId}`
    : PARTY_GATHERING_ENDPOINT;

export const cancelPartyGathering = async ({
  client,
  partyGathering,
  chatMessageIds,
}: CancelPartyGatheringOptions): Promise<CancelPartyGatheringResponse> => {
  const response = await client.delete<CancelPartyGatheringResponse>(
    getPartyGatheringCancellationPath(partyGathering.notificationId),
  );
  const responseData = response.data ?? { success: true, guildIds: [] };
  const canceledGuildIds = new Set(responseData.guildIds);
  const heroNick = Game.hero.nick;

  const updateMessagePromises = Object.entries(chatMessageIds).map(
    ([guildId, messageId]) => {
      if (!canceledGuildIds.has(guildId)) {
        return Promise.resolve();
      }

      return client
        .patch(`/guilds/${guildId}/chat-messages/${messageId}`, {
          message: `${heroNick} zakończył zbieranie grupy`,
        })
        .catch((error) => {
          console.warn(
            `Failed to update chat message in guild ${guildId}:`,
            error,
          );
        });
    },
  );

  await Promise.allSettled(updateMessagePromises);

  return responseData;
};
