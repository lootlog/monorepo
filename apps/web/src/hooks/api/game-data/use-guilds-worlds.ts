import { useQueries } from "@tanstack/react-query";
import { useApiClient } from "@/hooks/api/use-api-client";

export const useGuildsWorlds = (guildIds: string[]) => {
  const { client } = useApiClient();

  const queries = useQueries({
    queries: guildIds.map((guildId) => ({
      queryKey: ["worlds", guildId],
      queryFn: () => client.get<string[]>(`/guilds/${guildId}/worlds`),
      enabled: guildIds.length > 0,
      select: (response: { data: string[] }) => response.data,
    })),
  });

  const worlds = [
    ...new Set(queries.flatMap((query) => query.data ?? [])),
  ].sort();
  const isLoading = queries.some((query) => query.isLoading);

  return { worlds, isLoading };
};
