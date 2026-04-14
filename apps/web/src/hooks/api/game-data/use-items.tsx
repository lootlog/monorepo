import { useQuery } from "@tanstack/react-query";
import { SEARCH_API_URL } from "@/config/api";
import { useApiClient } from "@/hooks/api/use-api-client";
import { queryKeys } from "@/lib/query-keys";

export type GameItem = {
  id: number;
  hid: string;
  name: string;
  icon: string;
  lvl: number;
  rarity: string | null;
  type: string | null;
};

export type UseItemsOptions = {
  search?: string;
  world?: string;
  limit?: number;
};

export const useItems = ({ search, world, limit = 3 }: UseItemsOptions) => {
  const { client } = useApiClient();

  const queryParams = new URLSearchParams({
    ...(search && { search }),
    ...(world && { world }),
    limit: limit.toString(),
  });

  return useQuery({
    queryKey: queryKeys.gameData.items(search, world, limit),
    queryFn: () =>
      client.get<GameItem[]>(
        `${SEARCH_API_URL}/items?${queryParams.toString()}`,
      ),
    enabled: !!search && search.length >= 2,
  });
};
