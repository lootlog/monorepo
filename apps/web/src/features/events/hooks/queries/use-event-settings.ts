import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { UserGuildEventSettings } from "@lootlog/types";

export const eventSettingsQueryKey = (guildId: string) => [
  "event-settings",
  guildId,
];

export const useEventSettings = (guildId: string) => {
  const { client } = useApiClient();

  return useQuery<UserGuildEventSettings>({
    queryKey: eventSettingsQueryKey(guildId),
    queryFn: async () => {
      const response = await client.get<UserGuildEventSettings>(
        `/guilds/${guildId}/event-settings`,
      );
      return response.data;
    },
    enabled: !!guildId,
    staleTime: 5 * 60 * 1000,
  });
};
