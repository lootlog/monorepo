import { uniqueWorlds } from "#src/shared/unique-worlds";
import { upgradedAttackSpeed } from "@lootlog/domain/item-upgrade";
import { Effect } from "effect";
import { groupBy, sortBy } from "es-toolkit";
import type {
  CatalogChange,
  CatalogWriteFailure,
} from "#src/database/catalog-store";
import { changedDocuments } from "@lootlog/meilisearch/projection";
import { countEntries } from "#src/shared/entry-metrics";
import { npcMonsterKey, type NpcEntry } from "#src/npcs/npcs.service";
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
    retiredDropMonsterKeys?: string[];
    dropRates?: ItemDropRate[];
    revisions?: ItemRevisionsCommand["items"][number]["revisions"];
    changedOn?: string | null;
  };

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

const toItemDocuments = (items: ReadonlyArray<IndexItem>) =>
  mergeItemsByCatalogKey(items).map((item) => ({
    ...item,
    ...createItemSearchFields(item.stat),
    upgradedAttackSpeed: upgradedAttackSpeed(item),
  }));

export type CatalogWrite = <A, E>(
  run: (change: CatalogChange<ItemEntry, NpcEntry>) => Effect.Effect<A, E>,
) => Effect.Effect<A, E | CatalogWriteFailure>;

export type ItemEntry = ReturnType<typeof toItemDocuments>[number] &
  Pick<
    IndexedItem,
    "retiredDropMonsterKeys" | "dropRates" | "revisions" | "changedOn"
  >;

export const makeItemsModule = (write: CatalogWrite) => {
  const indexItems = Effect.fn("CatalogItems.index")(function* (
    data: IndexItemsCommand,
  ) {
    const validItems = data.items.filter(
      (item) => item.id && item.name && uniqueWorlds(item.worlds).length > 0,
    );

    if (validItems.length === 0) {
      yield* Effect.logWarning(
        "No valid items to index (missing required fields)",
      );

      return;
    }

    if (validItems.length !== data.items.length) {
      yield* Effect.logWarning(
        `Skipped ${data.items.length - validItems.length} items due to missing required fields`,
      );
    }

    const itemsWithSearchFields = toItemDocuments(validItems);

    const changedCount = yield* write((change) =>
      Effect.gen(function* () {
        const stored = yield* change.itemsByUids(
          itemsWithSearchFields.map(({ uid }) => uid),
        );

        const changed = changedDocuments(
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

        return changed.length;
      }),
    );

    yield* countEntries("items", itemsWithSearchFields.length, changedCount);
  });

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
