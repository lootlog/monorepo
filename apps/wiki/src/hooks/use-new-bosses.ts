import {
  type QueryClient,
  queryOptions,
  useQuery,
} from "@tanstack/react-query";
import {
  type CatalogControllerGetItemsParams,
  type CatalogDropSourceDtoOutput,
  type CatalogItemDtoOutput,
  getCatalogControllerGetItemsQueryKey,
  getCatalogControllerGetItemsQueryOptions,
  useCatalogControllerGetItems,
} from "@lootlog/client/catalog";
import { WIKI_GAME_VERSION } from "@/lib/catalog-links";
import { npcDropsQuery } from "@/lib/catalog-page-queries";
import { readCatalogItems } from "@/lib/catalog-pages";
import {
  groupItemsByMonster,
  isRetiredDropOf,
} from "@/lib/group-items-by-monster";
import { npcKindOf } from "@/lib/npc-types";

const PERMANENT_BOSS_KINDS = ["HERO", "TITAN", "COLOSSUS"];

const LATEST_BOSS_ITEMS = {
  gameVersion: WIKI_GAME_VERSION,
  dropSourceTypes: PERMANENT_BOSS_KINDS,
  excludedStatKeys: ["etiquette"],
  minLevel: 1,
  sort: "id:desc",
} satisfies CatalogControllerGetItemsParams;

const NEW_BOSSES_SHOWN = 6;

export type NewBoss = CatalogDropSourceDtoOutput;

const newBossesOf = (items: readonly CatalogItemDtoOutput[]) =>
  groupItemsByMonster(items, (source) =>
    PERMANENT_BOSS_KINDS.includes(npcKindOf(source) ?? ""),
  )
    .flatMap(({ monster }) => (monster ? [monster] : []))
    .slice(0, NEW_BOSSES_SHOWN);

const newBossesQueryOptions = () =>
  queryOptions({
    queryKey: [
      ...getCatalogControllerGetItemsQueryKey(LATEST_BOSS_ITEMS),
      "new-bosses",
    ],
    queryFn: async ({ signal }) =>
      newBossesOf(
        await readCatalogItems(LATEST_BOSS_ITEMS, {
          signal,
          isEnough: (items) => newBossesOf(items).length >= NEW_BOSSES_SHOWN,
        }),
      ),
  });

export const prefetchNewBosses = async (queryClient: QueryClient) => {
  const bosses = await queryClient.ensureQueryData(newBossesQueryOptions());

  await Promise.all(
    bosses.map(({ key }) =>
      queryClient.prefetchQuery(
        getCatalogControllerGetItemsQueryOptions(npcDropsQuery(key)),
      ),
    ),
  );
};

export const useNewBosses = () => {
  const { data, isError } = useQuery(newBossesQueryOptions());

  return { bosses: data, isError };
};

export const useBossDrops = (boss: NewBoss) => {
  const { data } = useCatalogControllerGetItems(npcDropsQuery(boss.key));

  return data?.hits.filter((item) => !isRetiredDropOf(item, boss));
};
