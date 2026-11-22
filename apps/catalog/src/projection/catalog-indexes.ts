import type { IndexSettings } from "@lootlog/meilisearch/index-settings";
import { classifyItemCategory } from "@lootlog/domain/item-type";
import { npcIconDirectory } from "@lootlog/domain/npc-type";
import { catalogItemTable, catalogNpcTable } from "#src/database/schema";

export const ITEMS_INDEX = "catalog_items";

export const NPCS_INDEX = "catalog_npcs";

type CatalogEntry = {
  readonly icon?: unknown;
  readonly monsterKey?: unknown;
  readonly firstSeenAt?: unknown;
  readonly type?: unknown;
  readonly stat?: unknown;
};

export type MonsterFirstSeen = ReadonlyMap<string, number>;

type CatalogIndex = {
  readonly settings: IndexSettings;
  readonly table: typeof catalogItemTable | typeof catalogNpcTable;
  readonly toDocuments: (
    entries: ReadonlyArray<CatalogEntry>,
    monsterFirstSeen: MonsterFirstSeen,
  ) => CatalogEntry[];
};

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
      faceting: {
        maxValuesPerFacet: 1000,
        sortFacetValuesBy: { "*": "alpha" },
      },
    },
  },
};

export const catalogIndexSettings = Object.fromEntries(
  Object.entries(catalogIndexes).map(([name, { settings }]) => [
    name,
    settings,
  ]),
);
