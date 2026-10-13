import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  getGuildsControllerGetWorldsByGuildIdQueryKey,
  getTimersControllerGetTimersQueryOptions,
  timersControllerGetTimers,
  useGuildsControllerGetWorldsByGuildId,
  type TimerResponseDto,
} from "@lootlog/client/main";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildWorld } from "@/hooks/context/use-guild-world";
import { keepOverdueTimers } from "./keep-overdue-timers";

/**
 * The Organization's timers on its world. Like the game client, timers are
 * read one world at a time, so each world keeps its pinned expired timers;
 * all worlds reads every world the Organization plays on.
 */
export const useGuildTimers = (removeTimerAfterMs: number) => {
  const guildId = useGuildId();
  const { world } = useGuildWorld();
  const queryClient = useQueryClient();
  const queryGuildId = guildId ?? "";
  const readsAllWorlds = world === null;

  const worldsQuery = useGuildsControllerGetWorldsByGuildId(
    { guildId: queryGuildId },
    {
      query: {
        enabled: Boolean(guildId) && readsAllWorlds,
        queryKey: getGuildsControllerGetWorldsByGuildIdQueryKey({
          guildId: queryGuildId,
        }),
      },
    },
  );

  const worlds = world ? [world] : worldsQuery.data;
  const hasWorldsError = readsAllWorlds && worldsQuery.isError;

  return useQueries({
    queries: (worlds ?? []).map((timersWorld) => {
      const params = { world: timersWorld };

      const options = getTimersControllerGetTimersQueryOptions(
        { guildId: queryGuildId },
        params,
        { query: { enabled: Boolean(guildId), staleTime: 15_000 } },
      );

      return {
        ...options,
        queryFn: async ({ signal }: { signal: AbortSignal }) =>
          keepOverdueTimers(
            await timersControllerGetTimers({ guildId: queryGuildId }, params, {
              signal,
            }),
            queryClient.getQueryData<TimerResponseDto[]>(options.queryKey),
            removeTimerAfterMs,
            Date.now(),
          ),
      };
    }),
    combine: (results) => {
      const loaded = results.filter((result) => result.data !== undefined);

      return {
        world,
        // Until every world answers, a partial list would read as complete.
        timers:
          worlds && loaded.length === results.length
            ? loaded.flatMap((result) => result.data ?? [])
            : undefined,
        isPending:
          (!worlds && !hasWorldsError) ||
          results.some((result) => result.isPending),
        isError: hasWorldsError || results.some((result) => result.isError),
        isFetching:
          (readsAllWorlds && worldsQuery.isFetching) ||
          results.some((result) => result.isFetching),
        fetchedAt: Math.min(...loaded.map((result) => result.dataUpdatedAt)),
        refetch: () =>
          Promise.all([
            ...(hasWorldsError ? [worldsQuery.refetch()] : []),
            ...results.map((result) => result.refetch()),
          ]),
      };
    },
  });
};
