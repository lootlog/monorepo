import { useQuery } from "@tanstack/react-query";
import { API_URL } from "config/api";
import { useApiClient } from "hooks/api/use-api-client";

export type GuildMember = {
  id: string;
  guildId: string;
  type: string;
  name: string;
  user: unknown;
};

export const useGuildMembers = (guildId?: string) => {
  const { client, isAuthenticated } = useApiClient();

  const query = useQuery({
    queryKey: ["guild-members", guildId],
    queryFn: () =>
      client.get<GuildMember[]>(`${API_URL}/guilds/${guildId}/members`),
    enabled: isAuthenticated && !!guildId,
    select: (response) => response.data,
  });

  return query;
};
