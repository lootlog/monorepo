import type { QueryClient } from "@tanstack/react-query";
import {
  getNotificationsGuildControllerGetGuildTargetsQueryOptions,
  getNotificationsGuildControllerGetGuildRulesQueryOptions,
  getGuildsControllerGetWorldsByGuildIdQueryOptions,
  getRolesControllerGetGuildRolesQueryOptions,
} from "@lootlog/client/main";
import { withRouteLoaderCancellation } from "@/lib/router/route-errors";

export const loadNotificationRuleForm = ({
  abortController,
  context,
  params,
}: {
  abortController: AbortController;
  context: { queryClient: QueryClient };
  params: { guildId: string };
}) =>
  withRouteLoaderCancellation(abortController, async () => {
    void Promise.all([
      context.queryClient.prefetchQuery(
        getNotificationsGuildControllerGetGuildTargetsQueryOptions({
          guildId: params.guildId,
        }),
      ),
      context.queryClient.prefetchQuery(
        getNotificationsGuildControllerGetGuildRulesQueryOptions({
          guildId: params.guildId,
        }),
      ),
      context.queryClient.prefetchQuery(
        getGuildsControllerGetWorldsByGuildIdQueryOptions({
          guildId: params.guildId,
        }),
      ),
    ]);
    await context.queryClient.ensureQueryData(
      getRolesControllerGetGuildRolesQueryOptions({
        guildId: params.guildId,
      }),
    );

    return null;
  });
