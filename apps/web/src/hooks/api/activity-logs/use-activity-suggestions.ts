import { queryOptions, useQuery } from "@tanstack/react-query";
import { useDebounceValue } from "usehooks-ts";
import {
  activityApiClient,
  type ApiRequestConfig,
} from "@/lib/api-client/api-client";

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
  suppressRouteErrorToast?: boolean;
};

type ActivitySuggestionsQueryOptionsParams = {
  endpoint: string;
  guildId?: string;
  search?: string;
  limit?: number;
  enabled?: boolean;
  responseKey?: string;
  requireSearch?: boolean;
  suppressRouteErrorToast?: boolean;
};

export const activitySuggestionsQueryOptions = ({
  endpoint,
  guildId,
  search = "",
  limit = 8,
  enabled = true,
  responseKey = "suggestions",
  requireSearch = true,
  suppressRouteErrorToast = false,
}: ActivitySuggestionsQueryOptionsParams) => {
  const trimmedSearch = search.trim();

  return queryOptions({
    queryKey: [endpoint, guildId, trimmedSearch, limit],
    queryFn: async () => {
      const response = await activityApiClient.get(
        `/guilds/${guildId}/activity-logs/${endpoint}`,
        {
          params: {
            search: trimmedSearch || undefined,
            limit,
          },
          suppressRouteErrorToast,
        } as ApiRequestConfig,
      );

      return (response.data as Record<string, string[]>)[responseKey];
    },
    enabled:
      enabled && !!guildId && (!requireSearch || trimmedSearch.length >= 1),
    staleTime: 5 * 60 * 1000,
  });
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
  const {
    responseKey = "suggestions",
    requireSearch = true,
    suppressRouteErrorToast = false,
  } = config;
  const [debouncedSearch] = useDebounceValue(search, debounceMs);

  return useQuery(
    activitySuggestionsQueryOptions({
      endpoint,
      guildId,
      search: debouncedSearch,
      limit,
      enabled,
      responseKey,
      requireSearch,
      suppressRouteErrorToast,
    }),
  );
};
