import type { QueryClient } from "@tanstack/react-query";

export function invalidateMapQueries(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
  mapId: string,
) {
  queryClient.invalidateQueries({
    queryKey: ["event-maps", guildId, eventId],
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
    queryKey: ["map-active-gap", guildId, eventId, mapId],
  });
  queryClient.invalidateQueries({
    queryKey: ["hero-active-gaps"],
    predicate: (query) =>
      query.queryKey[1] === guildId && query.queryKey[2] === eventId,
  });
}
