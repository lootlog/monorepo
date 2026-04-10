import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function invalidateMapQueries(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
  mapId: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.maps(guildId, eventId),
  });
  invalidateGapQueries(queryClient, guildId, eventId, mapId);
}

export function invalidateGapQueries(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
  mapId: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.mapActiveGap(guildId, eventId, mapId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.heroActiveGapsRoot(),
    predicate: (query) =>
      query.queryKey[1] === guildId && query.queryKey[2] === eventId,
  });
}
