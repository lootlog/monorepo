import { useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/features/public-api/query-keys";
import { fetchTimers } from "@/api";
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
