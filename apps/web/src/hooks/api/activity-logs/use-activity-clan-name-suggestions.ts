import { useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { useActivityApiClient } from "./use-activity-log-api-client";

export type ActivityClanNameSuggestionsResponse = {
  suggestions: string[];
};

type UseActivityClanNameSuggestionsOptions = {
  guildId?: string;
  search: string;
  limit?: number;
  debounceMs?: number;
  enabled?: boolean;
};

export const useActivityClanNameSuggestions = ({
  guildId,
  search,
  limit = 8,
  debounceMs = 200,
  enabled = true,
}: UseActivityClanNameSuggestionsOptions) => {
  const { client } = useActivityApiClient();
  const [debouncedSearch] = useDebounceValue(search, debounceMs);
  const trimmedSearch = debouncedSearch.trim();

  return useQuery({
    queryKey: ["activity-clan-name-suggestions", guildId, trimmedSearch, limit],
    queryFn: async () => {
      const response = await client.get<ActivityClanNameSuggestionsResponse>(
        `/guilds/${guildId}/activity-logs/clan-name-suggestions`,
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
