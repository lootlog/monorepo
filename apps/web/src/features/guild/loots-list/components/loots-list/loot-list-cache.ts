import type { InfiniteData, QueryClient } from "@tanstack/react-query";
import { z } from "zod";
import type { Loot } from "@/lib/loots/loot-types";

export const LOOTS_QUERY_GC_TIME_MS = 5 * 60_000;

export async function reconcileActiveLootLists(
  queryClient: QueryClient,
  guildId: string,
) {
  const queryKey = [`/guilds/${guildId}/loots`];
  await queryClient.cancelQueries({ queryKey, type: "active" });

  for (const [key] of queryClient.getQueriesData({
    queryKey,
    type: "active",
  })) {
    queryClient.setQueryData<InfiniteData<Loot[]>>(key, (old) =>
      old
        ? {
            pages: old.pages.slice(0, 1),
            pageParams: [0],
          }
        : old,
    );
  }

  // Inactive filters retain their history and become stale without HTTP work.
  await queryClient.invalidateQueries(
    { queryKey, refetchType: "active" },
    { throwOnError: true, cancelRefetch: false },
  );
}

export async function clearLootPolicyData(
  queryClient: QueryClient,
  organizationRoutes?: readonly string[],
) {
  const lootPath = z.string().regex(/^\/guilds\/[^/]+\/loots(?:\/\d+)?$/);
  const paths = organizationRoutes?.map((id) => `/guilds/${id}/loots`);

  const filters = {
    predicate: (query: { queryKey: readonly unknown[] }) => {
      const key = lootPath.safeParse(query.queryKey[0]);

      return (
        key.success &&
        (paths === undefined ||
          paths.some(
            (path) => key.data === path || key.data.startsWith(`${path}/`),
          ))
      );
    },
  };

  await queryClient.cancelQueries(filters);
  queryClient.removeQueries({ ...filters, type: "inactive" });

  for (const [key] of queryClient.getQueriesData({
    ...filters,
    type: "active",
  })) {
    const isList = z.string().endsWith("/loots").safeParse(key[0]).success;
    queryClient.setQueryData(
      key,
      isList ? { pages: [], pageParams: [] } : null,
    );
  }

  await queryClient.invalidateQueries({ ...filters, refetchType: "none" });
}
