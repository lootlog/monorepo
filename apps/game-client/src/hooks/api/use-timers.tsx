import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/features/public-api/query-keys";
import { fetchTimers } from "@/api";
import { getSocket } from "@/lib/socket";

type UseTimersOptions = {
  world?: string;
};

// A join normally completes well within this; past it the list loads without
// realtime and the next join refetches it.
const SESSION_WAIT_MS = 5_000;

export const useTimers = ({ world }: UseTimersOptions) => {
  const query = useQuery({
    queryKey: queryKeys.timers(world),
    enabled: !!world,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    // A snapshot read before the session joins can miss timer events, so the
    // join refetches it. Waiting first lets a page load fetch the list once.
    queryFn: async ({ signal }) => {
      await getSocket().waitForSession(SESSION_WAIT_MS, signal);
      signal.throwIfAborted();

      return fetchTimers(world, signal);
    },
  });

  return query;
};
