import type {
  InfiniteData,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";
import type { Loot } from "@/lib/loots/loot-types";

export const LOOTS_QUERY_GC_TIME_MS = 5 * 60_000;

export function patchActiveLootLists(
  queryClient: QueryClient,
  guildId: string,
  patch: (
    data: InfiniteData<Loot[]> | undefined,
    key: QueryKey,
  ) => InfiniteData<Loot[]> | undefined,
) {
  const queryKey = [`/guilds/${guildId}/loots`];
  for (const [key] of queryClient.getQueriesData({
    queryKey,
    type: "active",
  })) {
    queryClient.setQueryData<InfiniteData<Loot[]>>(key, (data) =>
      patch(data, key),
    );
  }
  // Keep loaded history, but refresh old filters when they are opened again.
  void queryClient.invalidateQueries({
    queryKey,
    type: "inactive",
    refetchType: "none",
  });
}
