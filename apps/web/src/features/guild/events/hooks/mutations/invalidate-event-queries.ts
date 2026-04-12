import type { QueryClient } from "@tanstack/react-query";
import {
  getListEventMapsQueryKey,
  getListEventsQueryKey,
  getShowEventOverviewQueryKey,
  getShowEventWrappedQueryKey,
} from "@/lib/api/generated/main/events/events";

export function invalidateEventDetailQueries(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
) {
  queryClient.invalidateQueries({
    queryKey: getShowEventOverviewQueryKey({ guildId, eventId }),
  });
  queryClient.invalidateQueries({
    queryKey: getListEventMapsQueryKey({ guildId, eventId }),
  });
  queryClient.invalidateQueries({
    queryKey: getShowEventWrappedQueryKey({ guildId, eventId }),
  });
  queryClient.invalidateQueries({
    queryKey: getListEventsQueryKey({ guildId }),
  });
}

export function invalidateEventMapStructureQueries(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
) {
  queryClient.invalidateQueries({
    queryKey: getListEventMapsQueryKey({ guildId, eventId }),
  });
  queryClient.invalidateQueries({
    queryKey: getShowEventWrappedQueryKey({ guildId, eventId }),
  });
}
