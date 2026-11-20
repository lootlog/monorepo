import { skipToken, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";
import { fetchTimers, type Timer } from "@/api/timers.api";
import { applyGameTimerAccess } from "@/lib/game-access-cache";
import { useRealtimeSnapshotReady } from "@/contexts/socket-context";

type UseTimersOptions = {
  world?: string;
};

export const useTimers = ({ world }: UseTimersOptions) => {
  const queryClient = useQueryClient();
  const snapshotReady = useRealtimeSnapshotReady();

  const query = useQuery({
    queryKey: queryKeys.timers(world),
    enabled: !!world && snapshotReady,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) =>
      applyGameTimerAccess(queryClient, await fetchTimers(world, signal)),
  });

  return query;
};

/**
 * Timers already loaded for the world, without requesting them: the timers
 * feature owns loading and live updates.
 */
export const useLoadedTimers = (world: string): Timer[] | undefined =>
  useQuery<Timer[]>({ queryKey: queryKeys.timers(world), queryFn: skipToken })
    .data;
