import { indexChangedDocuments } from "#src/meilisearch/index-changed-documents";
import {
  gameVersionOfWorld,
  type GameVersion,
} from "@lootlog/schema/game-version";
import { Effect } from "effect";
import type { Meilisearch, SearchParams } from "meilisearch";
import { getMeilisearchErrorCode } from "#src/meilisearch/query-builder";
import {
  attemptMeilisearch,
  type SearchOperationFailure,
} from "#src/meilisearch/search-operation-failure";
import type { AppLogger } from "#src/shared/logger";
import type { ItemSearchQuery } from "./item-search-query.js";
import { ITEMS_INDEX } from "./search-index.js";
import type { IndexItemsCommand } from "./index-items-command.js";
import type { ItemHit } from "./item-hit.js";
import { createItemSearchFields } from "./item-search-fields.js";

type SearchItemsResponse = {
  estimatedTotalHits: number;
  facetDistribution: Record<string, Record<string, number>>;
  facetStats: Record<string, { max: number; min: number }>;
  hits: ItemHit[];
};

type IndexItem = IndexItemsCommand["items"][number];

type IndexedItem = IndexItem & {
  gameVersion: GameVersion;
  uid: string;
  worlds: string[];
};

const itemAttributesToRetrieve = [
  "id",
  "name",
  "icon",
  "stat",
  "lvl",
  "rarity",
  "type",
  "world",
  "worlds",
];

const mapSearchResponse = (data: {
  estimatedTotalHits?: number;
  facetDistribution?: Record<string, Record<string, number>>;
  facetStats?: Record<string, { max: number; min: number }>;
  hits: ItemHit[];
  totalHits?: number;
}): SearchItemsResponse => ({
  hits: data.hits,
  estimatedTotalHits:
    data.estimatedTotalHits ?? data.totalHits ?? data.hits.length,
  facetDistribution: data.facetDistribution ?? {},
  facetStats: data.facetStats ?? {},
});

const uniqueWorlds = (worlds: ReadonlyArray<string>) =>
  [...new Set(worlds.filter(Boolean))].sort((first, second) =>
    first.localeCompare(second),
  );

const itemWorlds = (item: IndexItem) =>
  uniqueWorlds([...(item.worlds ?? []), ...(item.world ? [item.world] : [])]);

/**
 * One catalog entry per edition, item id and name. A template observed in
 * Polish and English, or renamed, keeps each name searchable instead of the
 * last observation replacing it.
 */
export const itemCatalogKey = (
  item: Pick<IndexItem, "id" | "name"> & { gameVersion: GameVersion },
) =>
  `${item.gameVersion}_${item.id}_${new Bun.CryptoHasher("sha256").update(item.name).digest("hex")}`;

const mergeItemsByCatalogKey = (
  items: ReadonlyArray<IndexItem>,
): IndexedItem[] => {
  const itemsByKey = new Map<string, IndexedItem>();

  for (const item of items) {
    const worlds = itemWorlds(item);

    // Older publishers sent no edition; every world belongs to one.
    const gameVersion = item.gameVersion ?? gameVersionOfWorld(worlds[0] ?? "");

    const uid = itemCatalogKey({ ...item, gameVersion });
    const existingItem = itemsByKey.get(uid);

    itemsByKey.set(uid, {
      ...existingItem,
      ...item,
      gameVersion,
      uid,
      worlds: uniqueWorlds([...(existingItem?.worlds ?? []), ...worlds]),
    });
  }

  return [...itemsByKey.values()];
};

/**
 * The stored shape of items: one document per catalog key with its worlds
 * merged and the searchable stat fields expanded. The seed script and the
 * consumer share it.
 */
export const toItemDocuments = (items: ReadonlyArray<IndexItem>) =>
  mergeItemsByCatalogKey(items).map(({ world: _world, ...item }) => ({
    ...item,
    ...createItemSearchFields(item.stat),
  }));

export const makeItemsModule = (
  meilisearch: Meilisearch,
  logger: AppLogger,
) => {
  const searchItems = Effect.fn("SearchItems.search")(function* ({
    facets,
    filter,
    limit,
    offset,
    search,
    sort,
  }: ItemSearchQuery) {
    const index = meilisearch.index<ItemHit>(ITEMS_INDEX);
    const searchTerm = search ?? "";
    let incomingFilters: string[] = [];

    if (Array.isArray(filter)) {
      incomingFilters = filter;
    } else if (filter) {
      incomingFilters = [filter];
    }

    const filters = incomingFilters;

    const query: SearchParams = {
      limit,
      offset,
      attributesToSearchOn: ["name", "stat"],
      attributesToRetrieve: itemAttributesToRetrieve,
    };

    if (facets && facets.length > 0) query.facets = facets;

    if (filters.length > 0) query.filter = filters.join(" AND ");

    if (sort && sort.length > 0) query.sort = sort;

    return yield* attemptMeilisearch("search.items", () =>
      index.search(searchTerm, query),
    ).pipe(
      Effect.map(mapSearchResponse),
      Effect.catch((error) => {
        if (
          getMeilisearchErrorCode(error.cause) ===
          "invalid_search_attributes_to_search_on"
        ) {
          logger.warn(
            "Items index settings are stale, retrying search without stat attribute",
            { error },
          );

          return attemptMeilisearch("search.items.fallback", () =>
            index.search(searchTerm, {
              ...query,
              attributesToSearchOn: ["name"],
            }),
          ).pipe(
            Effect.map(mapSearchResponse),
            Effect.catch((fallbackError) => {
              logger.error("Items search error", { error: fallbackError });

              return Effect.fail(fallbackError);
            }),
          );
        }

        logger.error("Items search error", { error });

        return Effect.fail(error);
      }),
    );
  });

  const getItems = Effect.fn("SearchItems.get")(function* ({
    limit,
    search,
  }: Pick<ItemSearchQuery, "limit" | "search">) {
    const response = yield* searchItems({
      limit,
      offset: 0,
      search,
    });

    return response.hits;
  });

  const indexItems = Effect.fn("SearchItems.index")(function* (
    data: IndexItemsCommand,
  ) {
    const index = meilisearch.index<IndexedItem>(ITEMS_INDEX);

    const validItems = data.items.filter((item) => {
      const worlds = itemWorlds(item);

      return item.id && item.name && worlds.length > 0;
    });

    if (validItems.length === 0) {
      logger.warn("No valid items to index (missing required fields)");

      return;
    }

    if (validItems.length !== data.items.length) {
      logger.warn(
        `Skipped ${data.items.length - validItems.length} items due to missing required fields`,
      );
    }

    const itemsWithSearchFields = toItemDocuments(validItems);

    yield* indexChangedDocuments(
      index,
      itemsWithSearchFields,
      (item, stored) => ({
        ...item,
        worlds: uniqueWorlds([...item.worlds, ...itemWorlds(stored ?? item)]),
      }),
    );
  });

  return { getItems, indexItems, searchItems } satisfies {
    readonly getItems: (
      input: Pick<ItemSearchQuery, "limit" | "search">,
    ) => Effect.Effect<ReadonlyArray<ItemHit>, SearchOperationFailure>;
    readonly indexItems: (
      data: IndexItemsCommand,
    ) => Effect.Effect<void, SearchOperationFailure>;
    readonly searchItems: (
      input: ItemSearchQuery,
    ) => Effect.Effect<SearchItemsResponse, SearchOperationFailure>;
  };
};
