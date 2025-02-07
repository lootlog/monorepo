import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "hooks/api/use-api-client";
import { useGuildId } from "hooks/use-guild-id";

export const useWorlds = () => {
  const guildId = useGuildId();
  const { client, isAuthenticated } = useApiClient();

  const query = useQuery({
    queryKey: ["worlds", guildId],
    queryFn: () => client.get<string[]>(`/guilds/${guildId}/worlds`),
    enabled: isAuthenticated && !!guildId,
    select: (response) => response.data,
  });

  return query;
};
