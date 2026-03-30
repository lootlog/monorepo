import { useQuery } from "@tanstack/react-query";
import { useNotificationsClient } from "./use-notifications-client";

export interface BotStatus {
  guildId: string;
  guildName: string;
  botPresent: boolean;
  permissions: {
    sendMessages: boolean;
    viewChannel: boolean;
    embedLinks: boolean;
    readMessageHistory: boolean;
  };
  canSendChannelMessages: boolean;
  canSendDm: boolean;
}

export const useBotStatus = (guildId: string | undefined) => {
  const { client } = useNotificationsClient();

  return useQuery<BotStatus | null>({
    queryKey: ["bot-status", guildId],
    queryFn: async () => {
      try {
        const { data } = await client.get("/discord-channels/bot-status", {
          params: { guildId },
        });
        return data;
      } catch {
        return null;
      }
    },
    enabled: !!guildId,
    staleTime: 60 * 1000,
  });
};
