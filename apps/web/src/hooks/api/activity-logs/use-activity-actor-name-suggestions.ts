import { useActivitySuggestions } from "./use-activity-suggestions";

type UseActivityActorNameSuggestionsOptions = {
  guildId?: string;
  search: string;
  limit?: number;
  debounceMs?: number;
  enabled?: boolean;
};

export const useActivityActorNameSuggestions = (
  options: UseActivityActorNameSuggestionsOptions,
) => useActivitySuggestions("actor-name-suggestions", options);
