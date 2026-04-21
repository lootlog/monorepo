import {
  getNotificationsGuildControllerGetAvailableGuildTargetsQueryOptions,
  getNotificationsGuildControllerGetGuildJobsQueryOptions,
  getNotificationsGuildControllerGetGuildRulesQueryOptions,
  getNotificationsGuildControllerGetGuildTargetsQueryOptions,
  invalidateNotificationsGuildControllerGetAvailableGuildTargets,
  invalidateNotificationsGuildControllerGetGuildJobs,
  invalidateNotificationsGuildControllerGetGuildRules,
  invalidateNotificationsGuildControllerGetGuildTargets,
} from "@/lib/api/generated/main/notifications/notifications";
import { queryKeys } from "@/lib/query-keys";
import type { QueryClient } from "@tanstack/react-query";

export const guildNotificationTargetsQueryKey = (guildId: string) =>
  [...queryKeys.guilds.notifications(guildId), "targets"] as const;

export const guildNotificationRulesQueryKey = (guildId: string) =>
  [...queryKeys.guilds.notifications(guildId), "rules"] as const;

export const guildNotificationJobsQueryKey = (guildId: string) =>
  queryKeys.guilds.notificationJobs(guildId);

export const guildAvailableNotificationTargetsQueryKey = (guildId: string) =>
  queryKeys.guilds.notificationAvailableTargets(guildId);

export const guildNotificationTargetsQueryOptions = (guildId: string) =>
  getNotificationsGuildControllerGetGuildTargetsQueryOptions(
    { guildId },
    {
      query: {
        queryKey: guildNotificationTargetsQueryKey(guildId),
      },
    },
  );

export const guildNotificationRulesQueryOptions = (guildId: string) =>
  getNotificationsGuildControllerGetGuildRulesQueryOptions(
    { guildId },
    {
      query: {
        queryKey: guildNotificationRulesQueryKey(guildId),
      },
    },
  );

export const guildNotificationJobsQueryOptions = (guildId: string) =>
  getNotificationsGuildControllerGetGuildJobsQueryOptions(
    { guildId },
    {
      query: {
        queryKey: guildNotificationJobsQueryKey(guildId),
      },
    },
  );

export const guildAvailableNotificationTargetsQueryOptions = (
  guildId: string,
  enabled = true,
) =>
  getNotificationsGuildControllerGetAvailableGuildTargetsQueryOptions(
    { guildId },
    {
      query: {
        queryKey: guildAvailableNotificationTargetsQueryKey(guildId),
        enabled: guildId.length > 0 && enabled,
      },
    },
  );

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
