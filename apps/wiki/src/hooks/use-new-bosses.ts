import {
  type CatalogControllerGetItemsParams,
  useCatalogControllerGetItems,
} from "@lootlog/client/search";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { groupItemsByMonster } from "@/lib/group-items-by-monster";

// Margonem adds items in id order, so the newest ones name the bosses an
// update brought. Event items have their own section, and level 0 chests
// drop from many old bosses.
const NEW_BOSS_ITEMS_FILTER = {
  dropSourceTypes: ["HERO", "EVENT_HERO", "TITAN", "COLOSSUS"],
  excludedStatKeys: ["etiquette"],
  minLevel: 1,
  sort: "id:desc",
  limit: 96,
} as const;

/** The newest items that drop from bosses. */
export const NEW_BOSS_ITEMS = {
  ...NEW_BOSS_ITEMS_FILTER,
  gameVersion: WIKI_GAME_VERSION,
  dropSourceTypes: [...NEW_BOSS_ITEMS_FILTER.dropSourceTypes],
  excludedStatKeys: [...NEW_BOSS_ITEMS_FILTER.excludedStatKeys],
} satisfies CatalogControllerGetItemsParams;

const BOSS_TYPES = new Set<string>(NEW_BOSS_ITEMS.dropSourceTypes);

/**
 * The bosses behind the game's newest items, newest first, each with those
 * items; undefined while they load.
 */
export const useNewBosses = () => {
  const { data, isError } = useCatalogControllerGetItems(NEW_BOSS_ITEMS);

  // An item may drop from minions too; the card belongs to its boss.
  const bosses = data
    ? groupItemsByMonster(data.hits, ({ type }) =>
        BOSS_TYPES.has(type ?? ""),
      ).flatMap(({ monster, items }) => (monster ? [{ monster, items }] : []))
    : undefined;

  return { bosses, isError };
};
