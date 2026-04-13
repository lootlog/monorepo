import { useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import { useDebounce } from "@/hooks/use-debounce";
import { queryKeys } from "@/lib/query-keys";

export type Warrior = {
  name: string;
  icon: string;
  prof: string;
  lvl: number;
};

export type SearchWarriorsResponse = {
  warriors: Warrior[];
};

export const useSearchWarriors = (searchQuery: string, debounceMs = 300) => {
  const { client } = useBattleLogApiClient();
  const debouncedQuery = useDebounce(searchQuery, debounceMs);

  const query = useQuery({
    queryKey: queryKeys.battleLog.searchWarriors(debouncedQuery),
    queryFn: () => {
      return client.get<SearchWarriorsResponse>(
        `/battles/@me/warriors/search`,
        {
          params: { q: debouncedQuery },
        },
      );
    },
    enabled: debouncedQuery.length >= 2,
    select: (response) => response.warriors,
  });

  return query;
};
