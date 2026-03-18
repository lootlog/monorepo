import { useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { useActivityApiClient } from "./use-activity-log-api-client";

type SuggestionsResponse = {
  suggestions: string[];
};

type UseActivitySuggestionsOptions = {
  guildId?: string;
  search: string;
  limit?: number;
  debounceMs?: number;
  enabled?: boolean;
};

export const useActivitySuggestions = (
  endpoint: string,
  {
    guildId,
    search,
    limit = 8,
    debounceMs = 200,
    enabled = true,
  }: UseActivitySuggestionsOptions,
) => {
  const { client } = useActivityApiClient();
  const [debouncedSearch] = useDebounceValue(search, debounceMs);
  const trimmedSearch = debouncedSearch.trim();

  return useQuery({
    queryKey: [endpoint, guildId, trimmedSearch, limit],
    queryFn: async () => {
      const response = await client.get<SuggestionsResponse>(
        `/guilds/${guildId}/activity-logs/${endpoint}`,
        {
          params: {
            search: trimmedSearch,
            limit,
          },
        },
      );

      return response.data.suggestions;
    },
    enabled: enabled && !!guildId && trimmedSearch.length >= 1,
    staleTime: 5 * 60 * 1000,
  });
};
