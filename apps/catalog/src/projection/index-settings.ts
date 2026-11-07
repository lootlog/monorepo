import type { IndexSettings } from "@lootlog/meilisearch/index-settings";
import { ITEMS_INDEX } from "#src/items/search-index";
import { NPCS_INDEX } from "#src/npcs/search-index";

/** The settings the catalog's indexes run with; the rebuild applies the same. */
export const catalogIndexSettings: Record<
  typeof ITEMS_INDEX | typeof NPCS_INDEX,
  IndexSettings
> = {
  [NPCS_INDEX]: {
    filterableAttributes: [
      "id",
      "name",
      "type",
      "uid",
      "monsterKey",
      "gameVersion",
      "current",
    ],
    sortableAttributes: ["firstSeenAt", "lvl", "name"],
  },
  [ITEMS_INDEX]: {
    filterableAttributes: [
      "id",
      "gameVersion",
      "worlds",
      "type",
      "rarity",
      "lvl",
      "elasticLevel",
      "stats",
      "numericStats",
      "requiredProfessions",
      "statsKeys",
      "legendaryBonus",
      "eventSlugs",
      "droppedByKeys",
      "droppedByMonsterKeys",
      "droppedByTypes",
      "retiredDropMonsterKeys",
      "firstSeenAt",
    ],
    searchableAttributes: ["name", "stat"],
    sortableAttributes: [
      "id",
      "name",
      "lvl",
      "rarity",
      "type",
      "firstSeenAt",
      "attackSpeed",
      "upgradedAttackSpeed",
      "changedOn",
    ],
    distinctAttribute: "id",
    // The events list counts every event slug; Meilisearch's default of 100
    // values per facet would drop the oldest. Written as Meilisearch returns
    // it, so startup sees it unchanged.
    faceting: { maxValuesPerFacet: 1000, sortFacetValuesBy: { "*": "alpha" } },
  },
};
