import { useQueryClient } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { Loot } from "@/hooks/api/loots/use-loots";

export const useLootFromCache = (lootId: number | null): Loot | null => {
  const queryClient = useQueryClient();
  const guildId = useGuildId();

  if (!lootId) return null;

  const queries = queryClient.getQueriesData<{
    pages: { data: Loot[] }[];
  }>({
    queryKey: ["loots", guildId],
    exact: false,
  });

  for (const [, data] of queries) {
    if (!data?.pages) continue;
    for (const page of data.pages) {
      const found = page.data.find((loot) => loot.id === lootId);
      if (found) return found;
    }
  }

  return null;
};
