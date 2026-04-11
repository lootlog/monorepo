import { useQuery } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { queryKeys } from "@/lib/query-keys";

export const useWorlds = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();

  const query = useQuery({
    queryKey: queryKeys.gameData.worlds(guildId),
    queryFn: () => client.get<string[]>(`/guilds/${guildId}/worlds`),
    enabled: !!guildId,
    select: (data) => data,
  });

  return query;
};
