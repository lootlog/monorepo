import {
  type CatalogControllerGetItemsParams,
  type CatalogItemDtoOutput,
  catalogControllerGetItems,
} from "@lootlog/client/catalog";

/**
 * The most hits a catalog search counts and returns: the catalog service's
 * Meilisearch `maxTotalHits`. A total that reaches it means "at least this
 * many".
 */
export const CATALOG_MAX_HITS = 1000;

const PAGE_SIZE = 96;

/**
 * Reads catalog items page by page until the search has no more, the hit cap
 * is reached, or `isEnough` accepts the items read so far.
 */
export const readCatalogItems = async (
  params: Omit<CatalogControllerGetItemsParams, "limit" | "offset">,
  {
    signal,
    isEnough = () => false,
  }: {
    signal: AbortSignal;
    isEnough?: (items: readonly CatalogItemDtoOutput[]) => boolean;
  },
) => {
  const items: CatalogItemDtoOutput[] = [];
  let total = CATALOG_MAX_HITS;

  while (items.length < Math.min(total, CATALOG_MAX_HITS) && !isEnough(items)) {
    const page = await catalogControllerGetItems(
      { ...params, limit: PAGE_SIZE, offset: items.length },
      { signal },
    );

    items.push(...page.hits);
    total = page.estimatedTotalHits;

    if (page.hits.length < PAGE_SIZE) break;
  }

  return items;
};
