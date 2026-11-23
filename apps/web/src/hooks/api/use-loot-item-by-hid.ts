import { useLootsControllerFetchLootsByGuildId } from "@lootlog/client/main";

export const useLootItemByHid = (
  guildId: string | undefined,
  itemHid: { hid: string; world: string } | null,
) => {
  const params = itemHid
    ? { hid: itemHid.hid, world: itemHid.world, limit: 1 }
    : undefined;

  return useLootsControllerFetchLootsByGuildId(
    { guildId: guildId ?? "" },
    params,
    {
      query: {
        enabled: !!guildId && !!params,
        staleTime: 5 * 60 * 1000,
        select: (page) =>
          page.items[0]?.items.find((item) => item.hid === params?.hid) ?? null,
      },
    },
  );
};
