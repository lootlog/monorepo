import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function invalidateRespawnQueries(
  queryClient: QueryClient,
  guildId: string | undefined,
  eventId: string,
  heroId: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.heroRespawnConfig(guildId, eventId, heroId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.heroTimers(guildId, eventId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.maps(guildId, eventId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.mapActiveGapRoot(guildId, eventId),
  });
}
