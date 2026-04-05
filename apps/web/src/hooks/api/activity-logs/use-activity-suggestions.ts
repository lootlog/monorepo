import { useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { useActivityApiClient } from "./use-activity-log-api-client";

export type UseActivitySuggestionsOptions = {
  guildId?: string;
  search?: string;
  limit?: number;
  debounceMs?: number;
  enabled?: boolean;
};

type UseActivitySuggestionsConfig = {
  responseKey?: string;
  requireSearch?: boolean;
};

export const useActivitySuggestions = (
  endpoint: string,
  {
    guildId,
    search = "",
    limit = 8,
    debounceMs = 200,
    enabled = true,
  }: UseActivitySuggestionsOptions,
  config: UseActivitySuggestionsConfig = {},
) => {
  const { responseKey = "suggestions", requireSearch = true } = config;
  const { client } = useActivityApiClient();
  const [debouncedSearch] = useDebounceValue(search, debounceMs);
  const trimmedSearch = debouncedSearch.trim();

  return useQuery({
    queryKey: [endpoint, guildId, trimmedSearch, limit],
    queryFn: async () => {
      const response = await client.get(
        `/guilds/${guildId}/activity-logs/${endpoint}`,
        {
          params: {
            search: trimmedSearch || undefined,
            limit,
          },
        },
      );

      return (response.data as Record<string, string[]>)[responseKey];
    },
    enabled:
      enabled && !!guildId && (!requireSearch || trimmedSearch.length >= 1),
    staleTime: 5 * 60 * 1000,
  });
};
