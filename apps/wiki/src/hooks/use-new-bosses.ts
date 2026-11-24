import type { QueryClient } from "@tanstack/react-query";
import {
  type CatalogControllerGetNpcsParams,
  type CatalogNpcDtoOutput,
  getCatalogControllerGetItemsQueryOptions,
  getCatalogControllerGetNpcsQueryOptions,
  useCatalogControllerGetItems,
  useCatalogControllerGetNpcs,
} from "@lootlog/client/catalog";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { npcDropsQuery } from "@/lib/catalog-page-queries";
import { isRetiredDropOf } from "@/lib/group-items-by-monster";

const NEWEST_PERMANENT_BOSSES = {
  gameVersion: WIKI_GAME_VERSION,
  types: ["HERO", "TITAN", "COLOSSUS"],
  bossOrigins: ["REGULAR"],
  sort: "firstSeenOn:desc",
  limit: 6,
} satisfies CatalogControllerGetNpcsParams;

export type NewBoss = CatalogNpcDtoOutput;

export const prefetchNewBosses = async (queryClient: QueryClient) => {
  const { hits } = await queryClient.ensureQueryData(
    getCatalogControllerGetNpcsQueryOptions(NEWEST_PERMANENT_BOSSES),
  );

  await Promise.all(
    hits.map(({ key }) =>
      queryClient.prefetchQuery(
        getCatalogControllerGetItemsQueryOptions(npcDropsQuery(key)),
      ),
    ),
  );
};

export const useNewBosses = () => {
  const { data, isError } = useCatalogControllerGetNpcs(
    NEWEST_PERMANENT_BOSSES,
  );

  return { bosses: data?.hits, isError };
};

export const useBossDrops = (boss: NewBoss) => {
  const { data } = useCatalogControllerGetItems(npcDropsQuery(boss.key));

  return data?.hits.filter((item) => !isRetiredDropOf(item, boss));
};
