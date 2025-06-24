import { useQuery } from "@tanstack/react-query";
import { API_URL } from "config/api";
import { useApiClient } from "hooks/api/use-api-client";
import { Guild } from "hooks/api/use-guild";

export const useGuildStatus = (guildId?: string, isSubmitted = false) => {
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: ["guild-status", guildId],
    queryFn: () => client.get<Guild>(`${API_URL}/guilds/${guildId}`),
    enabled: !!guildId && isSubmitted,
    select: (response) => response.data,
    refetchInterval: 2000,
  });

  return query;
};
