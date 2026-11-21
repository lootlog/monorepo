import type { IndexSettings } from "@lootlog/meilisearch/index-settings";
import { classifyItemCategory } from "@lootlog/domain/item-type";
import { npcIconDirectory } from "@lootlog/domain/npc-type";
import { catalogItemTable, catalogNpcTable } from "#src/database/schema";

export const ITEMS_INDEX = "catalog_items";

export const NPCS_INDEX = "catalog_npcs";

/** A stored catalog entry, of which a projection reads only what it derives from. */
type CatalogEntry = {
  readonly icon?: unknown;
  readonly monsterKey?: unknown;
  readonly firstSeenAt?: unknown;
  readonly type?: unknown;
  readonly stat?: unknown;
};

/** When each monster was first seen, by monster key, in epoch milliseconds. */
export type MonsterFirstSeen = ReadonlyMap<string, number>;

/**
 * A catalog index: the settings the service and the rebuild apply, the table
 * whose entries the rebuild fills it from, and what the index holds of
 * entries beyond what is stored.
 */
type CatalogIndex = {
  readonly settings: IndexSettings;
  readonly table: typeof catalogItemTable | typeof catalogNpcTable;
  readonly toDocuments: (
    entries: ReadonlyArray<CatalogEntry>,
    monsterFirstSeen: MonsterFirstSeen,
  ) => CatalogEntry[];
};

/**
 * When each monster of the entries was first seen: the earliest sighting of
 * any of its catalog identities. A boss seen by older clients keeps several,
 * and the newest of them dates a client's release, not the monster.
 */
export const earliestSeenByMonster = (
  entries: ReadonlyArray<CatalogEntry>,
): MonsterFirstSeen => {
  const earliest = new Map<string, number>();

  for (const { monsterKey, firstSeenAt } of entries) {
    const seenAt = Number(firstSeenAt ?? Number.NaN);
    const key = String(monsterKey ?? "");

    if (Number.isFinite(seenAt)) {
      earliest.set(key, Math.min(earliest.get(key) ?? seenAt, seenAt));
    }
  }

  return earliest;
};

/**
 * NPC entries with what the search derives: the directory of the graphic,
 * which it filters titans and colossi by, and when the entry's monster was
 * first seen, which dates and orders a listing. Neither is stored, so the
 * stored entries need no rewrite.
 */
const toNpcIndexDocuments = (
  entries: ReadonlyArray<CatalogEntry>,
  monsterFirstSeen: MonsterFirstSeen,
) =>
  entries.map((entry) => ({
    ...entry,
    iconDirectory: npcIconDirectory(String(entry.icon ?? "")),
    monsterFirstSeenAt:
      monsterFirstSeen.get(String(entry.monsterKey ?? "")) ?? null,
  }));

/**
 * Item entries with their browse category derived from `type` and `stat`
 * (`equipment`, `crafting`, or `other`), so stored entries need no rewrite.
 */
const toItemIndexDocuments = (entries: ReadonlyArray<CatalogEntry>) =>
  entries.map((entry) => ({
    ...entry,
    category: classifyItemCategory({
      type:
        entry.type === null || entry.type === undefined
          ? null
          : String(entry.type),
      stat: String(entry.stat ?? ""),
    }),
  }));

export const catalogIndexes: Record<
  typeof ITEMS_INDEX | typeof NPCS_INDEX,
  CatalogIndex
> = {
  [NPCS_INDEX]: {
    table: catalogNpcTable,
    toDocuments: toNpcIndexDocuments,
    settings: {
      filterableAttributes: [
        "id",
        "type",
        "lvl",
        "iconDirectory",
        "monsterFirstSeenAt",
        "monsterKey",
        "gameVersion",
        "current",
      ],
      // A search finds a monster by its name, not by the maps it is fought on.
      searchableAttributes: ["name"],
      sortableAttributes: ["lvl", "name", "monsterFirstSeenAt"],
    },
  },
  [ITEMS_INDEX]: {
    table: catalogItemTable,
    toDocuments: toItemIndexDocuments,
    settings: {
      filterableAttributes: [
        "id",
        "gameVersion",
        "type",
        "category",
        "rarity",
        "lvl",
        "elasticLevel",
        "requiredProfessions",
        "statsKeys",
        "legendaryBonus",
        "eventSlugs",
        "droppedByKeys",
        "droppedByMonsterKeys",
        "droppedByTypes",
      ],
      searchableAttributes: ["name"],
      sortableAttributes: [
        "id",
        "name",
        "lvl",
        "firstSeenAt",
        "attackSpeed",
        "upgradedAttackSpeed",
        "changedOn",
      ],
      distinctAttribute: "id",
      // The events list counts every event slug; Meilisearch's default of 100
      // values per facet would drop the oldest. Written as Meilisearch returns
      // it, so startup sees it unchanged.
      faceting: {
        maxValuesPerFacet: 1000,
        sortFacetValuesBy: { "*": "alpha" },
      },
    },
  },
};

/** The settings the catalog's indexes run with. */
export const catalogIndexSettings = Object.fromEntries(
  Object.entries(catalogIndexes).map(([name, { settings }]) => [
    name,
    settings,
  ]),
);
