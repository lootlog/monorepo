import { useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import { useActivityApiClient } from "./use-activity-log-api-client";

export type ActivityWorldSuggestionsResponse = {
  worlds: string[];
};

type UseActivityWorldSuggestionsOptions = {
  guildId?: string;
  search?: string;
  limit?: number;
  debounceMs?: number;
  enabled?: boolean;
};

export const useActivityWorldSuggestions = ({
  guildId,
  search = "",
  limit = 20,
  debounceMs = 200,
  enabled = true,
}: UseActivityWorldSuggestionsOptions) => {
  const { client } = useActivityApiClient();
  const [debouncedSearch] = useDebounceValue(search, debounceMs);
  const trimmedSearch = debouncedSearch.trim();

  return useQuery({
    queryKey: ["activity-world-suggestions", guildId, trimmedSearch, limit],
    queryFn: async () => {
      const response = await client.get<ActivityWorldSuggestionsResponse>(
        `/guilds/${guildId}/activity-logs/world-suggestions`,
        {
          params: {
            search: trimmedSearch || undefined,
            limit,
          },
        },
      );

      return response.data.worlds;
    },
    enabled: enabled && !!guildId,
    staleTime: 5 * 60 * 1000,
  });
};
