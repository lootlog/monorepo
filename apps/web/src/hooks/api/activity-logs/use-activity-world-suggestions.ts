import {
  activitySuggestionsQueryOptions,
  useActivitySuggestions,
  type UseActivitySuggestionsOptions,
} from "./use-activity-suggestions";

export const activityWorldSuggestionsQueryOptions = (
  options: UseActivitySuggestionsOptions,
) =>
  activitySuggestionsQueryOptions({
    ...options,
    endpoint: "world-suggestions",
    limit: options.limit ?? 20,
    responseKey: "worlds",
    requireSearch: false,
  });

export const useActivityWorldSuggestions = (
  options: UseActivitySuggestionsOptions,
) =>
  useActivitySuggestions(
    "world-suggestions",
    {
      ...options,
      limit: options.limit ?? 20,
    },
    {
      responseKey: "worlds",
      requireSearch: false,
    },
  );
