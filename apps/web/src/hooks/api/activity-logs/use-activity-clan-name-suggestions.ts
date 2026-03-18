import { useActivitySuggestions } from "./use-activity-suggestions";

type UseActivityClanNameSuggestionsOptions = {
  guildId?: string;
  search: string;
  limit?: number;
  debounceMs?: number;
  enabled?: boolean;
};

export const useActivityClanNameSuggestions = (
  options: UseActivityClanNameSuggestionsOptions,
) => useActivitySuggestions("clan-name-suggestions", options);
