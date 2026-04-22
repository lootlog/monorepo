import {
  invalidateNotificationsGuildControllerGetAvailableGuildTargets,
  invalidateNotificationsGuildControllerGetGuildJobs,
  invalidateNotificationsGuildControllerGetGuildRules,
  invalidateNotificationsGuildControllerGetGuildTargets,
} from "@/lib/api/generated/main/notifications/notifications";
import type { QueryClient } from "@tanstack/react-query";

export const invalidateGuildNotificationQueries = async (
  queryClient: QueryClient,
  guildId: string,
) => {
  await Promise.all([
    invalidateNotificationsGuildControllerGetGuildTargets(queryClient, {
      guildId,
    }),
    invalidateNotificationsGuildControllerGetGuildRules(queryClient, {
      guildId,
    }),
    invalidateNotificationsGuildControllerGetGuildJobs(queryClient, {
      guildId,
    }),
    invalidateNotificationsGuildControllerGetAvailableGuildTargets(
      queryClient,
      {
        guildId,
      },
    ),
  ]);
};
