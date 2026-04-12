import { useQuery } from "@tanstack/react-query";
import { battlelogApiClient } from "@/lib/api-client/api-client";
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
  const debouncedQuery = useDebounce(searchQuery, debounceMs);

  const query = useQuery({
    queryKey: queryKeys.battleLog.searchWarriors(debouncedQuery),
    queryFn: () => {
      return battlelogApiClient.get<SearchWarriorsResponse>(
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
