import {
  getLootsControllerFetchLootsByGuildIdQueryKey,
  lootsControllerFetchLootsByGuildId,
} from "@lootlog/client/main";
import { useQuery } from "@tanstack/react-query";

/**
 * The item with this in-game identifier among the Organization's loots, or null
 * when no loot recorded it; items bought or crafted never reach the loot list.
 */
export const useLootItemByHid = (
  guildId: string | undefined,
  itemHid: { hid: string; world: string } | null,
) => {
  const params = itemHid
    ? { hid: itemHid.hid, world: itemHid.world, limit: 1 }
    : undefined;

  return useQuery({
    queryKey: params
      ? getLootsControllerFetchLootsByGuildIdQueryKey(
          { guildId: guildId ?? "" },
          params,
        )
      : ["loot-search", "hid-item"],
    queryFn: async ({ signal }) => {
      if (!guildId || !params) {
        return null;
      }

      const response = await lootsControllerFetchLootsByGuildId(
        { guildId },
        params,
        { signal },
      );

      return response[0]?.items.find((item) => item.hid === params.hid) ?? null;
    },
    enabled: !!guildId && !!params,
    staleTime: 5 * 60 * 1000,
  });
};
