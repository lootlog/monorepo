import { useQuery } from "@tanstack/react-query";
import { stringify } from "qs";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { Loot } from "@/hooks/api/loots/use-loots";
import { queryKeys } from "@/lib/query-keys";

interface UseEventLootsOptions {
  guildId: string;
  npcNames: string[];
  world: string;
  limit?: number;
}

export const useEventLoots = ({
  guildId,
  npcNames,
  world,
  limit = 10,
}: UseEventLootsOptions) => {
  const { client } = useApiClient();

  const queryParams = {
    limit,
    npcs: npcNames.length > 0 ? npcNames : undefined,
    world,
  };

  const queryString = stringify(queryParams, {
    arrayFormat: "comma",
    allowEmptyArrays: false,
    filter: (_, value) => {
      if (value === "" || value === undefined || value === null) {
        return;
      }
      return value;
    },
  });

  return useQuery<Loot[]>({
    queryKey: queryKeys.events.loots(guildId, npcNames.join(","), world, limit),
    queryFn: async () => {
      const response = await client.get<Loot[]>(
        `/guilds/${guildId}/loots?${queryString}`,
      );
      return response;
    },
    enabled: !!guildId && !!world && npcNames.length > 0,
    refetchOnMount: "always",
    staleTime: 0,
    meta: { persist: false },
  });
};
