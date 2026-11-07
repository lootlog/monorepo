import { uniqueWorlds } from "#src/shared/unique-worlds";
import { upgradedAttackSpeed } from "@lootlog/domain/item-upgrade";
import { Effect } from "effect";
import { groupBy, sortBy } from "es-toolkit";
import type { Meilisearch, SearchParams } from "meilisearch";
import { getMeilisearchErrorCode } from "@lootlog/meilisearch/query-builder";
import {
  attemptMeilisearch,
  type SearchOperationFailure,
} from "@lootlog/meilisearch/operation-failure";
import type {
  CatalogChange,
  CatalogWriteFailure,
} from "#src/database/catalog-store";
import { changedEntries } from "#src/shared/changed-entries";
import { npcMonsterKey, type NpcEntry } from "#src/npcs/npcs.service";
import type { AppLogger } from "#src/shared/logger";
import type { ItemSearchQuery } from "./item-search-query.js";
import { ITEMS_INDEX } from "./search-index.js";
import type { IndexItemsCommand } from "./index-items-command.js";
import type { MonsterDropsCommand } from "./monster-drops-command.js";
import type { ItemRevisionsCommand } from "./item-revisions-command.js";
import type { ItemHit } from "./item-hit.js";
import { createItemSearchFields } from "./item-search-fields.js";
import {
  mergeItemDropFields,
  toItemDropFields,
  type ItemDropFields,
} from "./item-drops.js";
import {
  mergeItemLevels,
  toItemLevelFields,
  type ItemLevelFields,
} from "./item-levels.js";

type SearchItemsResponse = {
  estimatedTotalHits: number;
  facetDistribution: Record<string, Record<string, number>>;
  facetStats: Record<string, { max: number; min: number }>;
  hits: ItemHit[];
};

type IndexItem = IndexItemsCommand["items"][number];

type IndexedItem = Omit<IndexItem, "droppedBy" | "observedAt"> &
  ItemDropFields &
  ItemLevelFields & {
    uid: string;
    worlds: string[];
    /** The monsters of `droppedBy` that no longer drop the item. */
    retiredDropMonsterKeys?: string[];
    /** How often the kills of the monsters of `droppedBy` drop the item. */
    dropRates?: ItemDropRate[];
    /** The changes the game made to the item, oldest first. */
    revisions?: ItemRevisionsCommand["items"][number]["revisions"];
    /** The day the item's latest change was first looted, to list it by. */
    changedOn?: string | null;
  };

/** One monster's drops of an item over the kills that could record them. */
export type ItemDropRate = {
  monsterKey: string;
  drops: number;
  kills: number;
};

type MonsterDropFields = Required<
  Pick<IndexedItem, "retiredDropMonsterKeys" | "dropRates">
>;

const sameMonsterDrops = (left: MonsterDropFields, right: MonsterDropFields) =>
  Bun.deepEquals(
    [...left.retiredDropMonsterKeys].sort(),
    [...right.retiredDropMonsterKeys].sort(),
  ) &&
  Bun.deepEquals(
    sortBy(left.dropRates, [({ monsterKey }) => monsterKey]),
    sortBy(right.dropRates, [({ monsterKey }) => monsterKey]),
  );

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
      ...mergeItemLevels(toItemLevelFields(incoming), existingItem),
      uid,
      worlds: uniqueWorlds([...(existingItem?.worlds ?? []), ...worlds]),
    });
  }

  return [...itemsByKey.values()];
};

/**
 * The stored shape of items: one document per catalog key with its worlds
 * merged, the searchable stat fields expanded and the attack speed the item
 * adds at +5. The seed script and the consumer share it.
 */
export const toItemDocuments = (items: ReadonlyArray<IndexItem>) =>
  mergeItemsByCatalogKey(items).map(({ world: _world, ...item }) => ({
    ...item,
    ...createItemSearchFields(item.stat),
    upgradedAttackSpeed: upgradedAttackSpeed(item),
  }));

/** Runs one change to the catalog's entries; see `makeCatalogStore`. */
export type CatalogWrite = <A, E>(
  run: (change: CatalogChange<ItemEntry, NpcEntry>) => Effect.Effect<A, E>,
) => Effect.Effect<A, E | CatalogWriteFailure>;

/** A stored item entry: its document with the fields the API sets on a schedule. */
export type ItemEntry = ReturnType<typeof toItemDocuments>[number] &
  Pick<
    IndexedItem,
    "retiredDropMonsterKeys" | "dropRates" | "revisions" | "changedOn"
  >;

export const makeItemsModule = (
  meilisearch: Meilisearch,
  write: CatalogWrite,
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

  const indexItems = Effect.fn("CatalogItems.index")(function* (
    data: IndexItemsCommand,
  ) {
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

    yield* write((change) =>
      Effect.gen(function* () {
        const stored = yield* change.itemsByUids(
          itemsWithSearchFields.map(({ uid }) => uid),
        );

        const changed = yield* changedEntries(
          "items",
          itemsWithSearchFields,
          stored,
          (item, existing) => ({
            ...existing,
            ...item,
            ...mergeItemDropFields(item, existing),
            ...mergeItemLevels(item, existing),
            ...remainingRetiredDrops(item, existing),
            worlds: uniqueWorlds([...item.worlds, ...(existing?.worlds ?? [])]),
          }),
        );

        if (changed.length > 0) yield* change.saveItems(changed);
      }),
    );
  });

  /**
   * Replaces each monster's retired drops and drop rates on the items it
   * drops. Only those fields are written, so drops indexed meanwhile are
   * kept; a concurrent drop may restore a retirement until the next run,
   * never lose a source.
   */
  const setMonsterDrops = Effect.fn("CatalogItems.setMonsterDrops")(function* (
    data: MonsterDropsCommand,
  ) {
    yield* write((change) =>
      Effect.gen(function* () {
        const stored = new Map<string, ItemEntry>();
        const updated = new Map<string, ItemEntry>();

        for (const monster of data.monsters) {
          const monsterKey = npcMonsterKey(monster);
          const retired = new Set(monster.retiredItemIds);

          const rates = new Map(
            monster.dropRates.map(({ itemId, drops, kills }) => [
              itemId,
              { monsterKey, drops, kills },
            ]),
          );

          for (const document of yield* change.itemsByMonsterKey(monsterKey)) {
            if (!stored.has(document.uid)) stored.set(document.uid, document);

            const current = updated.get(document.uid) ?? document;
            const rate = rates.get(document.id);

            updated.set(document.uid, {
              ...current,
              retiredDropMonsterKeys: [
                ...(current.retiredDropMonsterKeys ?? []).filter(
                  (key) => key !== monsterKey,
                ),
                ...(retired.has(document.id) ? [monsterKey] : []),
              ],
              dropRates: [
                ...(current.dropRates ?? []).filter(
                  (entry) => entry.monsterKey !== monsterKey,
                ),
                ...(rate ? [rate] : []),
              ],
            });
          }
        }

        const changed = [...updated].flatMap(([uid, document]) => {
          const before = stored.get(uid);

          return before &&
            sameMonsterDrops(
              {
                retiredDropMonsterKeys: document.retiredDropMonsterKeys ?? [],
                dropRates: document.dropRates ?? [],
              },
              {
                retiredDropMonsterKeys: before.retiredDropMonsterKeys ?? [],
                dropRates: before.dropRates ?? [],
              },
            )
            ? []
            : [document];
        });

        if (changed.length > 0) yield* change.saveItems(changed);
      }),
    );
  });

  /**
   * Replaces the changes of each item, on every catalog entry of its edition
   * and id: a renamed item has one entry per name.
   */
  const setItemRevisions = Effect.fn("CatalogItems.setItemRevisions")(
    function* (data: ItemRevisionsCommand) {
      yield* write((change) =>
        Effect.gen(function* () {
          const changed: ItemEntry[] = [];

          for (const [gameVersion, items] of Object.entries(
            groupBy(data.items, (item) => item.gameVersion),
          )) {
            const revisionsById = new Map(
              items.map(({ id, revisions }) => [id, revisions]),
            );

            for (const document of yield* change.itemsByIds(gameVersion, [
              ...revisionsById.keys(),
            ])) {
              const revisions = [...(revisionsById.get(document.id) ?? [])];
              const changedOn = revisions.at(-1)?.changedBy ?? null;

              if (
                !Bun.deepEquals(revisions, document.revisions ?? []) ||
                changedOn !== (document.changedOn ?? null)
              ) {
                changed.push({ ...document, revisions, changedOn });
              }
            }
          }

          if (changed.length > 0) yield* change.saveItems(changed);
        }),
      );
    },
  );

  return {
    getItems,
    indexItems,
    setItemRevisions,
    setMonsterDrops,
    searchItems,
  } satisfies {
    readonly getItems: (
      input: Pick<ItemSearchQuery, "limit" | "search">,
    ) => Effect.Effect<ReadonlyArray<ItemHit>, SearchOperationFailure>;
    readonly indexItems: (
      data: IndexItemsCommand,
    ) => Effect.Effect<void, CatalogWriteFailure>;
    readonly setMonsterDrops: (
      data: MonsterDropsCommand,
    ) => Effect.Effect<void, CatalogWriteFailure>;
    readonly setItemRevisions: (
      data: ItemRevisionsCommand,
    ) => Effect.Effect<void, CatalogWriteFailure>;
    readonly searchItems: (
      input: ItemSearchQuery,
    ) => Effect.Effect<SearchItemsResponse, SearchOperationFailure>;
  };
};
