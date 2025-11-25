import { useQuery } from "@tanstack/react-query";
import { SEARCH_API_URL } from "@/config/api";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { Item } from "./use-items";
import type { Npc } from "./use-npcs";
import type { Player } from "./use-guild-players";

export type UseSearchAllOptions = {
  search?: string;
  world?: string;
  limit?: number;
  enabled?: boolean;
};

type SearchAllResponse = {
  items: Item[];
  npcs: Npc[];
  players: Player[];
};

export const useSearchAll = ({
  search,
  world,
  limit = 3,
  enabled = true,
}: UseSearchAllOptions) => {
  const { client } = useApiClient();

  const queryParams = new URLSearchParams({
    ...(search && { search }),
    ...(world && { world }),
    limit: limit.toString(),
  });

  return useQuery({
    queryKey: ["search-all", search, world, limit],
    queryFn: () =>
      client.get<SearchAllResponse>(
        `${SEARCH_API_URL}/all?${queryParams.toString()}`
      ),
    select: (response) => response.data,
    enabled: enabled && !!search && search.length >= 2,
  });
};
