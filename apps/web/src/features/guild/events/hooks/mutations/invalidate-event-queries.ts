import type { QueryClient } from "@tanstack/react-query";
import type { AccessPolicyChange } from "@lootlog/protocol/realtime/access-policy";
import { z } from "zod";
import {
  getEventsMonitoringControllerGetCoordinationQueryKey,
  getListEventMapsQueryKey,
  getListEventsQueryKey,
  getShowEventOverviewQueryKey,
  getShowEventWrappedQueryKey,
} from "@lootlog/client/main";

export function reconcileEventPolicyQueries(
  queryClient: QueryClient,
  changes?: readonly AccessPolicyChange[],
) {
  const filters = {
    predicate: (query: { queryKey: readonly unknown[] }) => {
      const path = z.string().safeParse(query.queryKey[0]).data;

      return (
        path !== undefined &&
        /^\/guilds\/[^/]+\/(?:events(?:\/|$)|permissions$|loots(?:\/|$))/.test(
          path,
        )
      );
    },
  };

  const restricted =
    !changes ||
    changes.some(
      (change) =>
        change.restricted &&
        change.areas.some((area) =>
          ["events", "organization", "loots"].includes(area),
        ),
    );

  if (!restricted) return queryClient.invalidateQueries(filters);

  void queryClient.cancelQueries(filters);
  queryClient.removeQueries({ ...filters, type: "inactive" });

  return queryClient.resetQueries({ ...filters, type: "active" });
}

export function invalidateEventCoordinationQuery(
  queryClient: QueryClient,
  guildId: string,
  eventId: string,
) {
  return queryClient.invalidateQueries({
    queryKey: getEventsMonitoringControllerGetCoordinationQueryKey({
      guildId,
      eventId,
    }),
  });
}

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
  return Promise.all([
    queryClient.invalidateQueries({
      queryKey: getListEventMapsQueryKey({ guildId, eventId }),
    }),
    queryClient.invalidateQueries({
      queryKey: getShowEventWrappedQueryKey({ guildId, eventId }),
    }),
  ]);
}
