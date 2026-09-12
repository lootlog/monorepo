import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import {
  type SearchTimersNpcResponseDtoOutput,
  getTimersControllerSearchNpcsWithTimerDataQueryKey,
  useTimersControllerSearchNpcsWithTimerData,
} from "@lootlog/client/main";

const MIN_SEARCH_LENGTH = 2;

const SEARCH_DEBOUNCE_MS = 300;

const SUGGESTIONS_BLUR_DELAY_MS = 200;

const getNpcSearchParams = (world: string | undefined, search: string) => ({
  limit: 10,
  search,
  world: world ?? "",
});

type UseNpcTimerSearchOptions = {
  guildId: string;
  world: string | undefined;
};

/** Debounced NPC lookup plus the keyboard/blur state of its suggestion list. */
export function useNpcTimerSearch({
  guildId,
  world,
}: UseNpcTimerSearchOptions) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debouncedSearch = useDebounce(query, SEARCH_DEBOUNCE_MS);
  const searchParams = getNpcSearchParams(world, debouncedSearch);

  const {
    data: results,
    isError: isFailed,
    isFetching: isLoading,
    refetch,
  } = useTimersControllerSearchNpcsWithTimerData({ guildId }, searchParams, {
    query: {
      queryKey: getTimersControllerSearchNpcsWithTimerDataQueryKey(
        { guildId },
        searchParams,
      ),
      enabled: debouncedSearch.length >= MIN_SEARCH_LENGTH && !!guildId,
      staleTime: 60000,
    },
  });

  // Cleanup intentionally reads the latest timer handle, not a DOM node or the initial null value.
  // oxlint-disable-next-line react-doctor/exhaustive-deps
  useEffect(() => {
    return () => {
      // This mutable timer handle must cancel the latest scheduled blur, not the mount-time value.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      if (blurTimeoutRef.current) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const reset = () => {
    setQuery("");
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

  const handleBlur = () => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current);
    }

    blurTimeoutRef.current = setTimeout(() => {
      setShowSuggestions(false);
      blurTimeoutRef.current = null;
    }, SUGGESTIONS_BLUR_DELAY_MS);
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLInputElement>,
    onSelect: (npc: SearchTimersNpcResponseDtoOutput) => void,
  ) => {
    if (event.nativeEvent.isComposing) return;

    if (!results || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      setShowSuggestions(true);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
      setShowSuggestions(true);
    } else if (event.key === "Enter" && selectedIndex >= 0) {
      event.preventDefault();
      onSelect(results[selectedIndex]);
    } else if (event.key === "Escape") {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const hasResults = Boolean(results?.length);

  const showNoResults =
    showSuggestions &&
    debouncedSearch.length >= MIN_SEARCH_LENGTH &&
    !hasResults &&
    !isLoading &&
    !isFailed;

  return {
    query,
    results: results ?? [],
    hasResults,
    isFailed,
    isLoading,
    showSuggestions,
    showNoResults,
    selectedIndex,
    handleQueryChange,
    handleBlur,
    handleKeyDown,
    retry: () => {
      void refetch();
    },
    reset,
  };
}
