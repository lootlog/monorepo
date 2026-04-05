import {
  useActivitySuggestions,
  type UseActivitySuggestionsOptions,
} from "./use-activity-suggestions";

export const useActivityWorldSuggestions = (
  options: UseActivitySuggestionsOptions,
) =>
  useActivitySuggestions(
    "world-suggestions",
    { ...options, limit: options.limit ?? 20 },
    {
      responseKey: "worlds",
      requireSearch: false,
    },
  );
