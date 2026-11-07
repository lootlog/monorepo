import { uniqueWorlds } from "#src/shared/unique-worlds";
import { upgradedAttackSpeed } from "@lootlog/domain/item-upgrade";
import { Effect } from "effect";
import { groupBy, sortBy } from "es-toolkit";
import type {
  CatalogChange,
  CatalogWriteFailure,
} from "#src/database/catalog-store";
import { changedEntries } from "#src/shared/changed-entries";
import { npcMonsterKey, type NpcEntry } from "#src/npcs/npcs.service";
import type { AppLogger } from "#src/shared/logger";
import type {
  CatalogItemObservation,
  CatalogItemRevisions,
  CatalogMonsterDrops,
} from "@lootlog/protocol/rabbit/catalog";
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

export type IndexItemsCommand = {
  readonly items: ReadonlyArray<CatalogItemObservation>;
};

export type MonsterDropsCommand = {
  readonly monsters: ReadonlyArray<CatalogMonsterDrops>;
};

export type ItemRevisionsCommand = {
  readonly items: ReadonlyArray<CatalogItemRevisions>;
};

type IndexItem = CatalogItemObservation;

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

/**
 * One monster's copies of an item over the kills that could record them and
 * the loot rolls of those kills. Entries indexed before rolls were counted
 * have none until the next daily run replaces them.
 */
export type ItemDropRate = {
  monsterKey: string;
  drops: number;
  kills: number;
  rolls?: number;
  basis?: CatalogMonsterDrops["dropRates"][number]["basis"];
  lootMode?: CatalogMonsterDrops["lootMode"];
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

    const uid = itemCatalogKey(item);
    const existingItem = itemsByKey.get(uid);

    itemsByKey.set(uid, {
      ...existingItem,
      ...item,
      ...mergeItemDropFields(toItemDropFields(incoming), existingItem),
      ...mergeItemLevels(toItemLevelFields(incoming), existingItem),
      uid,
      worlds: uniqueWorlds([...(existingItem?.worlds ?? []), ...item.worlds]),
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
  mergeItemsByCatalogKey(items).map((item) => ({
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

export const makeItemsModule = (write: CatalogWrite, logger: AppLogger) => {
  const indexItems = Effect.fn("CatalogItems.index")(function* (
    data: IndexItemsCommand,
  ) {
    const validItems = data.items.filter(
      (item) => item.id && item.name && uniqueWorlds(item.worlds).length > 0,
    );

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
            monster.dropRates.map(({ itemId, ...rate }) => [
              itemId,
              { monsterKey, ...rate, lootMode: monster.lootMode },
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
    indexItems,
    setItemRevisions,
    setMonsterDrops,
  } satisfies {
    readonly indexItems: (
      data: IndexItemsCommand,
    ) => Effect.Effect<void, CatalogWriteFailure>;
    readonly setMonsterDrops: (
      data: MonsterDropsCommand,
    ) => Effect.Effect<void, CatalogWriteFailure>;
    readonly setItemRevisions: (
      data: ItemRevisionsCommand,
    ) => Effect.Effect<void, CatalogWriteFailure>;
  };
};
