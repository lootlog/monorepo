import { useQuery } from "@tanstack/react-query";
import { useBattleLogApiClient } from "@/hooks/api/battle-log/use-battle-log-api-client";
import { useState, useEffect } from "react";

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
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery, debounceMs]);

  const query = useQuery({
    queryKey: ["warriors-search", debouncedQuery],
    queryFn: () => {
      return client.get<SearchWarriorsResponse>(
        `/battles/@me/warriors/search`,
        {
          params: { q: debouncedQuery },
        },
      );
    },
    enabled: debouncedQuery.length >= 2,
    select: (response) => response.data.warriors,
  });

  return query;
};
