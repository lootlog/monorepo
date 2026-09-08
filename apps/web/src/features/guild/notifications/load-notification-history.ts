import type { QueryClient } from "@tanstack/react-query";
import { getNotificationsGuildControllerGetGuildJobsQueryOptions } from "@lootlog/client/main";
import { prefetchRouteQuery } from "@/lib/router/route-prefetch";

export const loadNotificationHistory = ({
  context,
  params,
}: {
  context: { queryClient: QueryClient };
  params: { guildId: string };
}) => {
  void prefetchRouteQuery(
    context.queryClient,
    getNotificationsGuildControllerGetGuildJobsQueryOptions({
      guildId: params.guildId,
    }),
  );
};
