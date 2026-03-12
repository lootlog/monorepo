import type { QueryClient } from "@tanstack/react-query";

export function invalidateKillQueries(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
) {
  queryClient.invalidateQueries({
    queryKey: ["event-overview", guildId, eventId],
  });
  queryClient.invalidateQueries({
    queryKey: ["kill-detail", guildId, eventId],
    exact: false,
  });
  queryClient.invalidateQueries({
    queryKey: ["event-kill-history", guildId, eventId],
  });
  queryClient.invalidateQueries({
    queryKey: ["hero-kill-history", guildId, eventId],
  });
  queryClient.invalidateQueries({
    queryKey: ["event-member-kill-history", guildId, eventId],
  });
  queryClient.invalidateQueries({
    queryKey: ["recent-hero-kills", guildId, eventId],
  });
  queryClient.invalidateQueries({
    queryKey: ["event-hero-stats", guildId, eventId],
  });
  queryClient.invalidateQueries({
    queryKey: ["event-participation-confirmations", guildId, eventId],
  });
  queryClient.invalidateQueries({
    queryKey: ["event-ranking", guildId, eventId],
  });
}
