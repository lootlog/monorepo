import { useQueries, useQueryClient } from "@tanstack/react-query";
import {
  getTimersControllerGetTimersQueryOptions,
  timersControllerGetTimers,
  type TimerResponseDto,
} from "@lootlog/client/main";
import { useGuildWorldScope } from "@/hooks/context/use-guild-world-scope";
import { keepOverdueTimers } from "./keep-overdue-timers";

/**
 * The Organization's timers on its world. Like the game client, timers are
 * read one world at a time, so each world keeps its pinned expired timers;
 * all worlds reads every world the Organization plays on.
 */
export const useGuildTimers = (removeTimerAfterMs: number) => {
  const {
    guildId,
    world,
    worlds,
    hasWorldsError,
    isFetchingWorlds,
    refetchWorlds,
  } = useGuildWorldScope();

  const queryClient = useQueryClient();
  const queryGuildId = guildId ?? "";

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
          isFetchingWorlds || results.some((result) => result.isFetching),
        fetchedAt: Math.min(...loaded.map((result) => result.dataUpdatedAt)),
        refetch: () =>
          Promise.all([
            ...(hasWorldsError ? [refetchWorlds()] : []),
            ...results.map((result) => result.refetch()),
          ]),
      };
    },
  });
};
