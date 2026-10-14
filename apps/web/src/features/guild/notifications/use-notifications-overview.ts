import { useGuildDiscordSync } from "@/hooks/api/use-guild-discord-sync";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getNotificationsGuildControllerGetGuildJobsQueryKey,
  getNotificationsGuildControllerGetGuildRulesQueryKey,
  getNotificationsGuildControllerGetGuildTargetsQueryKey,
  useNotificationsGuildControllerGetGuildJobs,
  useNotificationsGuildControllerGetGuildRules,
  useNotificationsGuildControllerGetGuildTargets,
  type NotificationJobsResponseDto,
} from "@lootlog/client/main";
import { groupBy, minBy } from "es-toolkit";
import { isSupportedGuildNotificationTrigger } from "./utils/notification-settings.utils";

type PendingJob = NotificationJobsResponseDto["pending"][number];

type HistoryJob = NotificationJobsResponseDto["history"][number];

/** What the notifications page shows, whichever layout presents it. */
export const useNotificationsOverview = () => {
  const guildId = useGuildId() ?? "";
  const hasGuildId = Boolean(guildId);
  const sync = useGuildDiscordSync();

  const targetsQuery = useNotificationsGuildControllerGetGuildTargets(
    { guildId },
    {
      query: {
        enabled: hasGuildId,
        queryKey: getNotificationsGuildControllerGetGuildTargetsQueryKey({
          guildId,
        }),
      },
    },
  );

  const rulesQuery = useNotificationsGuildControllerGetGuildRules(
    { guildId },
    {
      query: {
        enabled: hasGuildId,
        queryKey: getNotificationsGuildControllerGetGuildRulesQueryKey({
          guildId,
        }),
      },
    },
  );

  const jobsQuery = useNotificationsGuildControllerGetGuildJobs(
    { guildId },
    {
      query: {
        enabled: hasGuildId,
        queryKey: getNotificationsGuildControllerGetGuildJobsQueryKey({
          guildId,
        }),
        refetchInterval: (query) =>
          query.state.data && query.state.data.pending.length > 0
            ? 5000
            : false,
      },
    },
  );

  const limits = rulesQuery.data?.limits;
  const pendingJobs = jobsQuery.data?.pending ?? [];
  const historyJobs = jobsQuery.data?.history ?? [];

  const pendingByRule = groupBy(pendingJobs, (job) => job.ruleId);
  const historyByRule = groupBy(historyJobs, (job) => job.ruleId);

  return {
    guildId,
    sync,
    hasRequiredPermissions: sync.permissionStatus === "ok",
    isLoading: targetsQuery.isLoading || rulesQuery.isLoading,
    targets: targetsQuery.data ?? [],
    rules:
      rulesQuery.data?.items.filter((rule) =>
        isSupportedGuildNotificationTrigger(rule.triggerType),
      ) ?? [],
    limits,
    isRuleLimitReached:
      limits !== undefined && limits.ruleCount >= limits.ruleLimit,
    jobs: jobsQuery.data,
    pendingJobs,
    historyJobs,
    /** The rule's next delivery, if one is queued. */
    getNextJob: (ruleId: number): PendingJob | undefined =>
      minBy(pendingByRule[ruleId] ?? [], (job) =>
        new Date(job.scheduledFor).getTime(),
      ),
    /** The rule's latest finished delivery. */
    getLastJob: (ruleId: number): HistoryJob | undefined =>
      minBy(
        historyByRule[ruleId] ?? [],
        (job) => -new Date(job.updatedAt).getTime(),
      ),
  };
};

export type NotificationsOverview = ReturnType<typeof useNotificationsOverview>;
