import { uniqueWorlds } from "#src/shared/unique-worlds";
import { indexChangedDocuments } from "#src/meilisearch/index-changed-documents";
import { Effect } from "effect";
import { chunk } from "es-toolkit";
import type { Meilisearch, SearchParams } from "meilisearch";
import {
  buildMeilisearchInFilter,
  getMeilisearchErrorCode,
} from "#src/meilisearch/query-builder";
import {
  attemptMeilisearch,
  completeMeilisearchTask,
  type SearchOperationFailure,
} from "#src/meilisearch/search-operation-failure";
import { npcMonsterKey } from "#src/npcs/npcs.service";
import type { AppLogger } from "#src/shared/logger";
import type { ItemSearchQuery } from "./item-search-query.js";
import { ITEMS_INDEX } from "./search-index.js";
import type { IndexItemsCommand } from "./index-items-command.js";
import type { RetiredDropsCommand } from "./retired-drops-command.js";
import type { ItemHit } from "./item-hit.js";
import { createItemSearchFields } from "./item-search-fields.js";
import {
  mergeItemDropFields,
  toItemDropFields,
  type ItemDropFields,
} from "./item-drops.js";

type SearchItemsResponse = {
  estimatedTotalHits: number;
  facetDistribution: Record<string, Record<string, number>>;
  facetStats: Record<string, { max: number; min: number }>;
  hits: ItemHit[];
};

type IndexItem = IndexItemsCommand["items"][number];

type IndexedItem = Omit<IndexItem, "droppedBy" | "observedAt"> &
  ItemDropFields & {
    uid: string;
    worlds: string[];
    /** The monsters of `droppedBy` that no longer drop the item. */
    retiredDropMonsterKeys?: string[];
  };

type RetiredDropsDocument = Pick<
  IndexedItem,
  "uid" | "id" | "retiredDropMonsterKeys"
>;

const RETIRED_DROPS_PAGE = 1000;

/**
 * The retired drops of an item seen dropping again: a monster that drops it
 * is no longer retired. Entries indexed before the field existed stay without.
 */
const remainingRetiredDrops = (
  incoming: Pick<ItemDropFields, "droppedByMonsterKeys">,
  stored: Pick<IndexedItem, "retiredDropMonsterKeys"> | undefined,
) =>
  stored?.retiredDropMonsterKeys === undefined
    ? {}
    : {
        retiredDropMonsterKeys: stored.retiredDropMonsterKeys.filter(
          (key) => !incoming.droppedByMonsterKeys.includes(key),
        ),
      };

const itemAttributesToRetrieve = [
  "id",
  "name",
  "icon",
  "stat",
  "lvl",
  "rarity",
  "type",
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

const itemWorlds = (item: IndexItem) =>
  uniqueWorlds([...(item.worlds ?? []), ...(item.world ? [item.world] : [])]);

/**
 * One catalog entry per edition, item id and name. A template observed in
 * Polish and English, or renamed, keeps each name searchable instead of the
 * last observation replacing it.
 */
export const itemCatalogKey = (
  item: Pick<IndexItem, "id" | "name" | "gameVersion">,
) =>
  `${item.gameVersion}_${item.id}_${new Bun.CryptoHasher("sha256").update(item.name).digest("hex")}`;

const mergeItemsByCatalogKey = (
  items: ReadonlyArray<IndexItem>,
): IndexedItem[] => {
  const itemsByKey = new Map<string, IndexedItem>();

  for (const incoming of items) {
    const {
      droppedBy: _droppedBy,
      observedAt: _observedAt,
      ...item
    } = incoming;

    const worlds = itemWorlds(item);
    const uid = itemCatalogKey(item);
    const existingItem = itemsByKey.get(uid);

    itemsByKey.set(uid, {
      ...existingItem,
      ...item,
      ...mergeItemDropFields(toItemDropFields(incoming), existingItem),
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
          ).pipe(Effect.map(mapSearchResponse));
        }

        return Effect.fail(error);
      }),
      Effect.tapError((error) =>
        Effect.sync(() => logger.error("Items search error", { error })),
      ),
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
        ...mergeItemDropFields(item, stored),
        ...remainingRetiredDrops(item, stored),
        worlds: uniqueWorlds([...item.worlds, ...(stored?.worlds ?? [])]),
      }),
    );
  });

  /**
   * Replaces each monster's retired drops. Only the retired field is written,
   * so drops indexed meanwhile are kept; a concurrent drop may restore a
   * retirement until the next run, never lose a source.
   */
  const markRetiredDrops = Effect.fn("SearchItems.markRetiredDrops")(function* (
    data: RetiredDropsCommand,
  ) {
    const index = meilisearch.index<IndexedItem>(ITEMS_INDEX);
    const stored = new Map<string, string[]>();
    const updated = new Map<string, string[]>();

    for (const monster of data.monsters) {
      const monsterKey = npcMonsterKey(monster);
      const retired = new Set(monster.retiredItemIds);

      // The items to retire, and those retired before that drop again.
      const affected = [
        `retiredDropMonsterKeys = ${JSON.stringify(monsterKey)}`,
        ...(retired.size > 0
          ? [buildMeilisearchInFilter("id", [...retired])]
          : []),
      ].join(" OR ");

      for (let offset = 0; ; offset += RETIRED_DROPS_PAGE) {
        const page = yield* attemptMeilisearch(
          "search.items.retiredDrops.existing",
          () =>
            index.getDocuments<RetiredDropsDocument>({
              filter: `droppedByMonsterKeys = ${JSON.stringify(monsterKey)} AND (${affected})`,
              fields: ["uid", "id", "retiredDropMonsterKeys"],
              limit: RETIRED_DROPS_PAGE,
              offset,
            }),
        );

        for (const document of page.results) {
          const keys = document.retiredDropMonsterKeys ?? [];

          if (!stored.has(document.uid)) stored.set(document.uid, keys);

          const others = (updated.get(document.uid) ?? keys).filter(
            (key) => key !== monsterKey,
          );

          updated.set(
            document.uid,
            retired.has(document.id) ? [...others, monsterKey] : others,
          );
        }

        if (page.results.length < RETIRED_DROPS_PAGE) break;
      }
    }

    const changed = [...updated].flatMap(([uid, retiredDropMonsterKeys]) =>
      Bun.deepEquals(
        [...retiredDropMonsterKeys].sort(),
        [...(stored.get(uid) ?? [])].sort(),
      )
        ? []
        : [{ uid, retiredDropMonsterKeys }],
    );

    for (const batch of chunk(changed, 500)) {
      yield* completeMeilisearchTask("search.items.retiredDrops.index", () =>
        index.updateDocuments(batch),
      );
    }
  });

  return { getItems, indexItems, markRetiredDrops, searchItems } satisfies {
    readonly getItems: (
      input: Pick<ItemSearchQuery, "limit" | "search">,
    ) => Effect.Effect<ReadonlyArray<ItemHit>, SearchOperationFailure>;
    readonly indexItems: (
      data: IndexItemsCommand,
    ) => Effect.Effect<void, SearchOperationFailure>;
    readonly markRetiredDrops: (
      data: RetiredDropsCommand,
    ) => Effect.Effect<void, SearchOperationFailure>;
    readonly searchItems: (
      input: ItemSearchQuery,
    ) => Effect.Effect<SearchItemsResponse, SearchOperationFailure>;
  };
};
