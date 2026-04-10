import { useQueries } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";
import { queryKeys } from "@/lib/query-keys";

export const useGuildsWorlds = (guildIds: string[]) => {
  const { client } = useApiClient();

  const queries = useQueries({
    queries: guildIds.map((guildId) => ({
      queryKey: queryKeys.gameData.worlds(guildId),
      queryFn: () => client.get<string[]>(`/guilds/${guildId}/worlds`),
      enabled: guildIds.length > 0,
      select: (response: string[]) => response,
    })),
  });

  const worlds = [
    ...new Set(queries.flatMap((query) => query.data ?? [])),
  ].sort();
  const isLoading = queries.some((query) => query.isLoading);

  return { worlds, isLoading };
};
