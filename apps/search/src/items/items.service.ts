import { Effect } from "effect";
import type { Meilisearch, SearchParams } from "meilisearch";
import { getMeilisearchErrorCode } from "#src/meilisearch/meilisearch.utils";
import {
  attemptMeilisearch,
  type SearchOperationFailure,
} from "#src/meilisearch/search-operation-failure";
import type { AppLogger } from "#src/shared/logger";
import type { GetItemsDto } from "./dto/get-items.dto.js";
import { ITEMS_INDEX } from "./constants/meilisearch.js";
import type { IndexItemsDto } from "./dto/index-items.dto.js";
import type { ItemHit } from "./dto/item-hit.schema.js";
import { createItemSearchFields } from "./utils/create-item-search-fields.js";

type SearchItemsResponse = {
  estimatedTotalHits: number;
  facetDistribution: Record<string, Record<string, number>>;
  facetStats: Record<string, { max: number; min: number }>;
  hits: ItemHit[];
};

type IndexItem = IndexItemsDto["items"][number];
type IndexedItem = IndexItem & {
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

const buildItemWorldFilter = (world: string) => {
  const formattedWorld = JSON.stringify(world);

  return `(worlds = ${formattedWorld} OR world = ${formattedWorld})`;
};

const emptySearchResponse = (): SearchItemsResponse => ({
  hits: [],
  estimatedTotalHits: 0,
  facetDistribution: {},
  facetStats: {},
});

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

const mergeItemsById = (items: ReadonlyArray<IndexItem>): IndexedItem[] => {
  const itemsById = new Map<number, IndexedItem>();

  for (const item of items) {
    const worlds = itemWorlds(item);
    const existingItem = itemsById.get(item.id);
    itemsById.set(item.id, {
      ...existingItem,
      ...item,
      uid: String(item.id),
      worlds: uniqueWorlds([...(existingItem?.worlds ?? []), ...worlds]),
    });
  }

  return [...itemsById.values()];
};

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
    world,
  }: GetItemsDto) {
    const index = meilisearch.index<ItemHit>(ITEMS_INDEX);
    const searchTerm = search ?? "";
    let incomingFilters: string[] = [];

    if (Array.isArray(filter)) {
      incomingFilters = filter;
    } else if (filter) {
      incomingFilters = [filter];
    }

    const filters = [
      ...incomingFilters,
      ...(world ? [buildItemWorldFilter(world)] : []),
    ];

    const query: SearchParams = {
      limit,
      offset,
      attributesToSearchOn: ["name", "stat"],
      attributesToRetrieve: itemAttributesToRetrieve,
      ...(facets && facets.length > 0 ? { facets } : {}),
      ...(filters.length > 0 ? { filter: filters.join(" AND ") } : {}),
      ...(sort && sort.length > 0 ? { sort } : {}),
    };

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
              return Effect.succeed(emptySearchResponse());
            }),
          );
        }
        logger.error("Items search error", { error });
        return Effect.succeed(emptySearchResponse());
      }),
    );
  });

  const getItems = Effect.fn("SearchItems.get")(function* ({
    limit,
    search,
    world,
  }: Pick<GetItemsDto, "limit" | "search" | "world">) {
    const response = yield* searchItems({
      limit,
      offset: 0,
      search,
      world,
    });
    return response.hits;
  });

  const existingWorlds = (uid: string) => {
    const index = meilisearch.index<IndexedItem>(ITEMS_INDEX);
    return attemptMeilisearch("search.items.existing-worlds", () =>
      index.getDocument(uid),
    ).pipe(
      Effect.map((document) => document.worlds ?? []),
      Effect.catch((error) => {
        if (getMeilisearchErrorCode(error.cause) !== "document_not_found") {
          logger.warn("Could not read existing item worlds", { error, uid });
        }
        return Effect.succeed([] as string[]);
      }),
    );
  };

  const indexItems = Effect.fn("SearchItems.index")(function* (
    data: IndexItemsDto,
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

    const itemsById = mergeItemsById(validItems);
    const itemsWithExistingWorlds = yield* Effect.all(
      itemsById.map((item) =>
        Effect.map(existingWorlds(item.uid), (storedWorlds) => {
          return {
            ...item,
            worlds: uniqueWorlds([...item.worlds, ...storedWorlds]),
          };
        }),
      ),
      { concurrency: "unbounded" },
    );
    const itemsWithSearchFields = itemsWithExistingWorlds.map(
      ({ world: _world, ...item }) => ({
        ...item,
        ...createItemSearchFields(item.stat),
      }),
    );

    yield* attemptMeilisearch("search.items.index", () =>
      index.addDocuments(itemsWithSearchFields, {
        primaryKey: "uid",
      }),
    );
  });

  return { getItems, indexItems, searchItems } satisfies {
    readonly getItems: (
      input: Pick<GetItemsDto, "limit" | "search" | "world">,
    ) => Effect.Effect<ReadonlyArray<ItemHit>>;
    readonly indexItems: (
      data: IndexItemsDto,
    ) => Effect.Effect<void, SearchOperationFailure>;
    readonly searchItems: (
      input: GetItemsDto,
    ) => Effect.Effect<SearchItemsResponse>;
  };
};
