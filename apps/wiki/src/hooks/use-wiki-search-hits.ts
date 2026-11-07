import { keepPreviousData } from "@tanstack/react-query";
import {
  useCatalogControllerGetItems,
  useCatalogControllerGetNpcs,
} from "@lootlog/client/catalog";
import { useDebounce } from "@lootlog/ui/hooks/use-debounce";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";

export const MIN_SEARCH_QUERY_LENGTH = 2;

const HITS_PER_GROUP = 5;

/**
 * The first items and monsters whose names match `query`, fetched once the
 * User pauses typing.
 */
export function useWikiSearchHits(query: string, enabled: boolean) {
  const debouncedQuery = useDebounce(query, 150);
  const isTyping = debouncedQuery !== query;

  const queryOptions = {
    enabled: enabled && debouncedQuery.length >= MIN_SEARCH_QUERY_LENGTH,
    placeholderData: keepPreviousData,
  };

  const items = useCatalogControllerGetItems(
    {
      search: debouncedQuery,
      gameVersion: WIKI_GAME_VERSION,
      limit: HITS_PER_GROUP,
    },
    { query: queryOptions },
  );

  const npcs = useCatalogControllerGetNpcs(
    {
      search: debouncedQuery,
      gameVersion: WIKI_GAME_VERSION,
      limit: HITS_PER_GROUP,
    },
    { query: queryOptions },
  );

  return {
    debouncedQuery,
    itemHits: items.data?.hits ?? [],
    npcHits: npcs.data?.hits ?? [],
    isPending: items.isPending || npcs.isPending,
    isFetching: isTyping || items.isFetching || npcs.isFetching,
    hasError: items.isError && npcs.isError,
    /** The hits still answer an earlier query. */
    isStale: isTyping || items.isPlaceholderData || npcs.isPlaceholderData,
  };
}
