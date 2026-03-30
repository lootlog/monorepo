import { useQuery } from "@tanstack/react-query";
import { useNotificationsClient } from "./use-notifications-client";
import type { DiscordChannel } from "./types";

export const useDiscordChannels = (guildId: string) => {
  const { client } = useNotificationsClient();

  return useQuery<DiscordChannel[]>({
    queryKey: ["discord-channels", guildId],
    queryFn: async () => {
      const { data } = await client.get("/discord-channels", {
        params: { guildId },
      });
      return data;
    },
    enabled: !!guildId,
    staleTime: 5 * 60 * 1000,
  });
};
