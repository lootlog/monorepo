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
  queryClient.invalidateQueries({
    queryKey: ["map-active-gap", guildId, eventId, mapId],
  });
}
