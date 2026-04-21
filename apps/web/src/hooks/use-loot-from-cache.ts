import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { Loot } from "@/lib/loots/loot-types";

export const useLootFromCache = (lootId: number | null): Loot | null => {
  const queryClient = useQueryClient();
  const guildId = useGuildId();

  if (!lootId) return null;

  const queries = queryClient.getQueriesData<
    InfiniteData<Loot[] | { data?: Loot[] }>
  >({
    queryKey: [`/guilds/${guildId}/loots`],
    exact: false,
  });

  for (const [, data] of queries) {
    if (!data?.pages) continue;

    for (const page of data.pages) {
      const pageLoots = Array.isArray(page) ? page : page.data;
      const found = pageLoots?.find((loot) => loot.id === lootId);

      if (found) return found;
    }
  }

  return null;
};
