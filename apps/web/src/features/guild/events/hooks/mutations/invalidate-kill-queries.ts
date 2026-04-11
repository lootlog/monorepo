import type { QueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query-keys";

export function invalidateKillQueries(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
) {
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.overview(guildId, eventId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.killDetailRoot(guildId, eventId),
    exact: false,
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.killHistoryRoot(guildId, eventId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.heroKillHistoryRoot(guildId, eventId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.memberKillHistoryRoot(guildId, eventId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.recentHeroKillsRoot(guildId, eventId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.heroStats(guildId, eventId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.participationConfirmations(guildId, eventId),
  });
  queryClient.invalidateQueries({
    queryKey: queryKeys.events.ranking(guildId, eventId),
  });
}
