import type { QueryClient } from "@tanstack/react-query";

export function invalidateRespawnQueries(
  queryClient: QueryClient,
  guildId: string | undefined,
  eventId: string,
  heroId: string,
) {
  queryClient.invalidateQueries({
    queryKey: ["hero-respawn-config", guildId, eventId, heroId],
  });
  queryClient.invalidateQueries({
    queryKey: ["event-hero-timers", guildId, eventId],
  });
  queryClient.invalidateQueries({
    queryKey: ["event-maps", guildId, eventId],
  });
  queryClient.invalidateQueries({
    queryKey: ["map-active-gap", guildId, eventId],
  });
}
