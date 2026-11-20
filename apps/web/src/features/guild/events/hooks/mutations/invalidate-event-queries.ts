import type { QueryClient } from "@tanstack/react-query";
import {
  getListEventMapsQueryKey,
  getListEventsQueryKey,
  getShowEventQueryKey,
  getShowEventWrappedQueryKey,
} from "@lootlog/client/main";

export function invalidateEventDetailQueries(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
) {
  queryClient.invalidateQueries({
    queryKey: getShowEventQueryKey({ guildId, eventId }),
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
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: getListEventMapsQueryKey({ guildId, eventId }),
    }),
    queryClient.invalidateQueries({
      queryKey: getShowEventWrappedQueryKey({ guildId, eventId }),
    }),
  ]);
}
