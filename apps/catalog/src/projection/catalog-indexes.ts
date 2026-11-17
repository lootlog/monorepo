import type { IndexSettings } from "@lootlog/meilisearch/index-settings";
import { catalogItemTable, catalogNpcTable } from "#src/database/schema";

export const ITEMS_INDEX = "catalog_items";

export const NPCS_INDEX = "catalog_npcs";

/**
 * A catalog index: the settings the service and the rebuild apply, and the
 * table whose documents the rebuild fills it from.
 */
type CatalogIndex = {
  readonly settings: IndexSettings;
  readonly table: typeof catalogItemTable | typeof catalogNpcTable;
};

export const catalogIndexes: Record<
  typeof ITEMS_INDEX | typeof NPCS_INDEX,
  CatalogIndex
> = {
  [NPCS_INDEX]: {
    table: catalogNpcTable,
    settings: {
      filterableAttributes: [
        "id",
        "type",
        "monsterKey",
        "gameVersion",
        "current",
      ],
      // A search finds a monster by its name, not by the maps it is fought on.
      searchableAttributes: ["name"],
      sortableAttributes: ["lvl", "name"],
    },
  },
  [ITEMS_INDEX]: {
    table: catalogItemTable,
    settings: {
      filterableAttributes: [
        "id",
        "gameVersion",
        "type",
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
