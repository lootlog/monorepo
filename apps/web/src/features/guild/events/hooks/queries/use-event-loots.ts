import { useQuery } from "@tanstack/react-query";
import {
  getLootsControllerFetchLootsByGuildIdQueryKey,
  lootsControllerFetchLootsByGuildId,
  type LootsControllerFetchLootsByGuildIdParams,
} from "@lootlog/client/main";

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

  return useQuery({
    queryKey: getLootsControllerFetchLootsByGuildIdQueryKey(
      { guildId },
      params,
    ),
    queryFn: ({ signal }) =>
      lootsControllerFetchLootsByGuildId({ guildId }, params, { signal }),
    select: (page) => page.items,
    enabled: !!guildId && !!world && npcNames.length > 0,
    staleTime: EVENT_LIVE_QUERY_STALE_TIME_MS,
  });
};
