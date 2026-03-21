import { useQuery } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useApiClient } from "@/hooks/api/use-api-client";
import { useGuildContext } from "@/hooks/context/use-guild-context";
import { useLootsFilters } from "@/hooks/use-loots-filters";
import { createLootsQueryString } from "@/hooks/api/loots/create-loots-query-string";

export type UseLootsCountResponse = {
  count: number;
};

export const useLootsCount = () => {
  const guildId = useGuildId();
  const { client } = useApiClient();
  const { world } = useGuildContext();
  const { filters } = useLootsFilters();

  const queryString = createLootsQueryString({ filters, world });

  const query = useQuery({
    queryKey: ["loots", "count", guildId, queryString],
    queryFn: () =>
      client.get<UseLootsCountResponse>(
        `/guilds/${guildId}/loots/count?${queryString}`,
      ),
    enabled: !!guildId && !!world,
    refetchOnMount: "always",
    staleTime: 0,
    meta: { persist: false },
  });

  return query;
};
