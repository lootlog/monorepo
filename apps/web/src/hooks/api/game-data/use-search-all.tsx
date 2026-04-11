import { useQuery } from "@tanstack/react-query";
import { SEARCH_API_URL } from "@/config/api";
import { useApiClient } from "@/hooks/api/use-api-client";
import type { GameItem } from "./use-items";
import type { Npc } from "./use-npcs";
import type { Player } from "./use-guild-players";
import { queryKeys } from "@/lib/query-keys";

export type UseSearchAllOptions = {
  search?: string;
  world?: string;
  limit?: number;
  enabled?: boolean;
};

type SearchAllResponse = {
  items: GameItem[];
  npcs: Npc[];
  players: Player[];
};

export const useSearchAll = ({
  search,
  world,
  limit = 5,
  enabled = true,
}: UseSearchAllOptions) => {
  const { client } = useApiClient();

  const queryParams = new URLSearchParams({
    ...(search && { search }),
    ...(world && { world }),
    limit: limit.toString(),
  });

  return useQuery({
    queryKey: queryKeys.gameData.searchAll(search, world, limit),
    queryFn: () =>
      client.get<SearchAllResponse>(
        `${SEARCH_API_URL}/all?${queryParams.toString()}`,
      ),
    select: (data) => data,
    enabled: enabled && !!search && search.length >= 2,
  });
};
