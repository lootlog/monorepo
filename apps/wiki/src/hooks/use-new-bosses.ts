import type { QueryClient } from "@tanstack/react-query";
import {
  type CatalogControllerGetItemsParams,
  type CatalogDropSourceDtoOutput,
  type CatalogItemDtoOutput,
  getCatalogControllerGetItemsQueryOptions,
  useCatalogControllerGetItems,
} from "@lootlog/client/catalog";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { npcDropsQuery } from "@/lib/catalog-page-queries";
import {
  groupItemsByMonster,
  isRetiredDropOf,
} from "@/lib/group-items-by-monster";
import { npcKindOf } from "@/lib/npc-types";

const NEW_BOSS_ITEMS_FILTER = {
  dropSourceTypes: ["HERO", "TITAN", "COLOSSUS"],
  excludedStatKeys: ["etiquette"],
  minLevel: 1,
  sort: "id:desc",
  limit: 96,
} as const;

const NEW_BOSS_ITEMS = {
  ...NEW_BOSS_ITEMS_FILTER,
  gameVersion: WIKI_GAME_VERSION,
  dropSourceTypes: [...NEW_BOSS_ITEMS_FILTER.dropSourceTypes],
  excludedStatKeys: [...NEW_BOSS_ITEMS_FILTER.excludedStatKeys],
} satisfies CatalogControllerGetItemsParams;

const PERMANENT_BOSS_KINDS = new Set<string>(NEW_BOSS_ITEMS.dropSourceTypes);

const NEW_BOSSES_SHOWN = 6;

const newBossesOf = (items: readonly CatalogItemDtoOutput[]) =>
  groupItemsByMonster(items, (source) =>
    PERMANENT_BOSS_KINDS.has(npcKindOf(source) ?? ""),
  )
    .flatMap(({ monster }) => (monster ? [monster] : []))
    .slice(0, NEW_BOSSES_SHOWN);

export const prefetchNewBosses = async (queryClient: QueryClient) => {
  const { hits } = await queryClient.ensureQueryData(
    getCatalogControllerGetItemsQueryOptions(NEW_BOSS_ITEMS),
  );

  await Promise.all(
    newBossesOf(hits).map(({ key }) =>
      queryClient.prefetchQuery(
        getCatalogControllerGetItemsQueryOptions(npcDropsQuery(key)),
      ),
    ),
  );
};

export const useNewBosses = () => {
  const { data, isError } = useCatalogControllerGetItems(NEW_BOSS_ITEMS);

  return { bosses: data ? newBossesOf(data.hits) : undefined, isError };
};

export const useBossDrops = (boss: CatalogDropSourceDtoOutput) => {
  const { data } = useCatalogControllerGetItems(npcDropsQuery(boss.key));

  return data?.hits.filter((item) => !isRetiredDropOf(item, boss));
};
