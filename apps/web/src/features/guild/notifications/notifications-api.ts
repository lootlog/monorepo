import {
  getNotificationsGuildControllerGetGuildJobsQueryKey,
  getNotificationsGuildControllerGetGuildRulesQueryKey,
  getNotificationsGuildControllerGetGuildTargetsQueryKey,
  invalidateNotificationsGuildControllerGetAvailableGuildTargets,
  invalidateNotificationsGuildControllerGetGuildJobs,
  invalidateNotificationsGuildControllerGetGuildRules,
  invalidateNotificationsGuildControllerGetGuildTargets,
} from "@/lib/api/generated/main/notifications/notifications";
import type { QueryClient } from "@tanstack/react-query";
import type {
  GuildNotificationRulesResponseDto,
  NotificationJobsResponseDto,
  NotificationTargetResponseDto,
} from "@/lib/api/generated/main/model";

export type GuildNotificationCacheSnapshot = {
  rules: GuildNotificationRulesResponseDto | undefined;
  targets: NotificationTargetResponseDto[] | undefined;
  jobs: NotificationJobsResponseDto | undefined;
};

export const guildNotificationRulesCacheQueryKey = (guildId: string) =>
  getNotificationsGuildControllerGetGuildRulesQueryKey({ guildId });

export const guildNotificationTargetsCacheQueryKey = (guildId: string) =>
  getNotificationsGuildControllerGetGuildTargetsQueryKey({ guildId });

export const guildNotificationJobsCacheQueryKey = (guildId: string) =>
  getNotificationsGuildControllerGetGuildJobsQueryKey({ guildId });

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

export const cancelGuildNotificationQueries = async (
  queryClient: QueryClient,
  guildId: string,
) => {
  await Promise.all([
    queryClient.cancelQueries({
      queryKey: guildNotificationTargetsCacheQueryKey(guildId),
    }),
    queryClient.cancelQueries({
      queryKey: guildNotificationRulesCacheQueryKey(guildId),
    }),
    queryClient.cancelQueries({
      queryKey: guildNotificationJobsCacheQueryKey(guildId),
    }),
  ]);
};

export const getGuildNotificationCacheSnapshot = (
  queryClient: QueryClient,
  guildId: string,
): GuildNotificationCacheSnapshot => ({
  rules: queryClient.getQueryData<GuildNotificationRulesResponseDto>(
    guildNotificationRulesCacheQueryKey(guildId),
  ),
  targets: queryClient.getQueryData<NotificationTargetResponseDto[]>(
    guildNotificationTargetsCacheQueryKey(guildId),
  ),
  jobs: queryClient.getQueryData<NotificationJobsResponseDto>(
    guildNotificationJobsCacheQueryKey(guildId),
  ),
});

export const restoreGuildNotificationCacheSnapshot = (
  queryClient: QueryClient,
  guildId: string,
  snapshot: GuildNotificationCacheSnapshot | undefined,
) => {
  queryClient.setQueryData(
    guildNotificationRulesCacheQueryKey(guildId),
    snapshot?.rules,
  );
  queryClient.setQueryData(
    guildNotificationTargetsCacheQueryKey(guildId),
    snapshot?.targets,
  );
  queryClient.setQueryData(
    guildNotificationJobsCacheQueryKey(guildId),
    snapshot?.jobs,
  );
};

export const removeGuildNotificationRuleFromCache = (
  queryClient: QueryClient,
  guildId: string,
  ruleId: number,
) => {
  queryClient.setQueryData<GuildNotificationRulesResponseDto>(
    guildNotificationRulesCacheQueryKey(guildId),
    (currentRules) =>
      currentRules
        ? {
            ...currentRules,
            items: currentRules.items.filter((rule) => rule.id !== ruleId),
          }
        : currentRules,
  );

  queryClient.setQueryData<NotificationJobsResponseDto>(
    guildNotificationJobsCacheQueryKey(guildId),
    (currentJobs) =>
      currentJobs
        ? {
            ...currentJobs,
            pending: currentJobs.pending.filter(
              (job) => job.rule.id !== ruleId,
            ),
          }
        : currentJobs,
  );
};

export const removeGuildNotificationTargetFromCache = (
  queryClient: QueryClient,
  guildId: string,
  targetId: number,
) => {
  queryClient.setQueryData<NotificationTargetResponseDto[]>(
    guildNotificationTargetsCacheQueryKey(guildId),
    (currentTargets) =>
      currentTargets?.filter((target) => target.id !== targetId) ??
      currentTargets,
  );

  queryClient.setQueryData<GuildNotificationRulesResponseDto>(
    guildNotificationRulesCacheQueryKey(guildId),
    (currentRules) =>
      currentRules
        ? {
            ...currentRules,
            items: currentRules.items.map((rule) => ({
              ...rule,
              targets: rule.targets.filter(
                ({ target }) => target.id !== targetId,
              ),
            })),
          }
        : currentRules,
  );

  queryClient.setQueryData<NotificationJobsResponseDto>(
    guildNotificationJobsCacheQueryKey(guildId),
    (currentJobs) =>
      currentJobs
        ? {
            ...currentJobs,
            pending: currentJobs.pending.filter(
              (job) => job.target.id !== targetId,
            ),
          }
        : currentJobs,
  );
};

export const removeGuildNotificationJobFromCache = (
  queryClient: QueryClient,
  guildId: string,
  jobId: string,
) => {
  queryClient.setQueryData<NotificationJobsResponseDto>(
    guildNotificationJobsCacheQueryKey(guildId),
    (currentJobs) =>
      currentJobs
        ? {
            ...currentJobs,
            pending: currentJobs.pending.filter((job) => job.id !== jobId),
          }
        : currentJobs,
  );
};
