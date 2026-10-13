import { useQueries } from "@tanstack/react-query";
import {
  getGuildsControllerGetWorldsByGuildIdQueryKey,
  getTimersControllerGetTimersQueryOptions,
  useGuildsControllerGetWorldsByGuildId,
} from "@lootlog/client/main";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildWorld } from "@/hooks/context/use-guild-world";

/**
 * The Organization's timers on its world. Like the game client, timers are
 * read one world at a time, so each world keeps its pinned expired timers;
 * all worlds reads every world the Organization plays on.
 */
export const useGuildTimers = () => {
  const guildId = useGuildId();
  const { world } = useGuildWorld();
  const queryGuildId = guildId ?? "";

  const { data: guildWorlds } = useGuildsControllerGetWorldsByGuildId(
    { guildId: queryGuildId },
    {
      query: {
        enabled: Boolean(guildId) && world === null,
        queryKey: getGuildsControllerGetWorldsByGuildIdQueryKey({
          guildId: queryGuildId,
        }),
      },
    },
  );

  const worlds = world ? [world] : guildWorlds;

  return useQueries({
    queries: (worlds ?? []).map((timersWorld) =>
      getTimersControllerGetTimersQueryOptions(
        { guildId: queryGuildId },
        { world: timersWorld },
        { query: { enabled: Boolean(guildId), staleTime: 15_000 } },
      ),
    ),
    combine: (results) => {
      const loaded = results.filter((result) => result.data !== undefined);

      return {
        world,
        // Until every world answers, a partial list would read as complete.
        timers:
          worlds && loaded.length === results.length
            ? loaded.flatMap((result) => result.data ?? [])
            : undefined,
        isPending: !worlds || results.some((result) => result.isPending),
        isError: results.some((result) => result.isError),
        isFetching: results.some((result) => result.isFetching),
        fetchedAt: Math.min(...loaded.map((result) => result.dataUpdatedAt)),
        refetch: () => Promise.all(results.map((result) => result.refetch())),
      };
    },
  });
};
