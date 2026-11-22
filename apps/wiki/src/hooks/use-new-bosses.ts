import {
  type CatalogControllerGetItemsParams,
  useCatalogControllerGetItems,
} from "@lootlog/client/catalog";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { groupItemsByMonster } from "@/lib/group-items-by-monster";

const NEW_BOSS_ITEMS_FILTER = {
  dropSourceTypes: ["HERO", "EVENT_HERO", "TITAN", "COLOSSUS"],
  excludedStatKeys: ["etiquette"],
  minLevel: 1,
  sort: "id:desc",
  limit: 96,
} as const;

export const NEW_BOSS_ITEMS = {
  ...NEW_BOSS_ITEMS_FILTER,
  gameVersion: WIKI_GAME_VERSION,
  dropSourceTypes: [...NEW_BOSS_ITEMS_FILTER.dropSourceTypes],
  excludedStatKeys: [...NEW_BOSS_ITEMS_FILTER.excludedStatKeys],
} satisfies CatalogControllerGetItemsParams;

const BOSS_TYPES = new Set<string>(NEW_BOSS_ITEMS.dropSourceTypes);

export const useNewBosses = () => {
  const { data, isError } = useCatalogControllerGetItems(NEW_BOSS_ITEMS);

  const bosses = data
    ? groupItemsByMonster(data.hits, ({ type }) =>
        BOSS_TYPES.has(type ?? ""),
      ).flatMap(({ monster, items }) => (monster ? [{ monster, items }] : []))
    : undefined;

  return { bosses, isError };
};
