import { useQuery } from "@tanstack/react-query";
import {
  getLootsControllerFetchLootsByGuildIdQueryKey,
  lootsControllerFetchLootsByGuildId,
} from "@lootlog/client/main";
import type { LootsControllerFetchLootsByGuildIdParams } from "@lootlog/client/main";
import type { Loot } from "@/lib/loots/loot-types";

interface UseEventLootsOptions {
  guildId: string;
  npcNames: string[];
  world: string;
  limit?: number;
}

const EVENT_LIVE_QUERY_STALE_TIME_MS = 10_000;

export const useEventLoots = ({
  guildId,
  npcNames,
  world,
  limit = 10,
}: UseEventLootsOptions) => {
  const params = {
    limit,
    npcs: npcNames,
    world,
  } satisfies LootsControllerFetchLootsByGuildIdParams;

  return useQuery<Loot[]>({
    queryKey: getLootsControllerFetchLootsByGuildIdQueryKey(
      { guildId },
      params,
    ),
    queryFn: () =>
      lootsControllerFetchLootsByGuildId({ guildId }, params) as Promise<
        Loot[]
      >,
    enabled: !!guildId && !!world && npcNames.length > 0,
    staleTime: EVENT_LIVE_QUERY_STALE_TIME_MS,
  });
};
