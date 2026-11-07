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
      "type",
      "monsterKey",
      "gameVersion",
      "current",
    ],
    // A search finds a monster by its name, not by the maps it is fought on.
    searchableAttributes: ["name"],
    sortableAttributes: ["lvl", "name"],
  },
  [ITEMS_INDEX]: {
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
    faceting: { maxValuesPerFacet: 1000, sortFacetValuesBy: { "*": "alpha" } },
  },
};
