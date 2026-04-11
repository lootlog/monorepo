import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient } from "@/lib/api-client/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  NotificationTargetType as NotificationTargetTypeEnum,
  type DiscordGuildChannelSnapshot,
  type DiscordGuildSyncState,
  type NotificationFilters,
  type NotificationJobKind,
  type NotificationScheduleAnchor,
  type NotificationScheduleIntervalType,
  type NotificationScheduleStrategy,
  type NotificationJobStatus,
  type NotificationTargetType,
  type NotificationTriggerType,
} from "@lootlog/types";
import {
  type QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export type GuildNotificationTarget = {
  id: number;
  externalId: string;
  displayName: string | null;
  targetType: NotificationTargetType;
  active: boolean;
  canSend: boolean;
  updatedAt: string;
};

export type GuildNotificationRule = {
  id: number;
  name: string | null;
  contentTemplate: string | null;
  triggerType: NotificationTriggerType;
  world: string | null;
  scheduleStrategy: NotificationScheduleStrategy | null;
  scheduleAnchor: NotificationScheduleAnchor | null;
  scheduleOffsetMinutes: number | null;
  scheduledAt: string | null;
  scheduleIntervalType: NotificationScheduleIntervalType | null;
  scheduleIntervalValue: number | null;
  scheduleWeekday: number | null;
  scheduleTimeOfDay: string | null;
  scheduledUntil: string | null;
  scheduleTimezone: string | null;
  enabled: boolean;
  updatedAt: string;
  filters: NotificationFilters | null;
  testTrigger: {
    limit: number;
    used: number;
    remaining: number;
    windowSeconds: number;
    nextAvailableAt: string | null;
  };
  targets: Array<{
    target: GuildNotificationTarget;
  }>;
};

export type GuildNotificationJob = {
  id: string;
  jobKind: NotificationJobKind;
  scheduledFor: string;
  status: NotificationJobStatus;
  lastError: string | null;
  blockedReason: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
  attemptCount: number;
  providerMessageId: string | null;
  sourceEntityType: string | null;
  sourceEntityId: string | null;
  payloadSnapshot: Record<string, unknown> | null;
  rule: {
    id: number;
    name: string | null;
    triggerType: NotificationTriggerType;
    world: string | null;
    enabled: boolean;
    scheduleStrategy: NotificationScheduleStrategy | null;
    scheduleAnchor: NotificationScheduleAnchor | null;
    scheduleOffsetMinutes: number | null;
  };
  target: GuildNotificationTarget;
};

export type GuildNotificationsResponse = {
  targets: GuildNotificationTarget[];
  rules: GuildNotificationRule[];
  limits: {
    ruleLimit: number;
    ruleCount: number;
    maxNpcsPerRule: number;
    testTriggerLimit: number;
    testTriggerWindowSeconds: number;
  };
  jobs: {
    pending: GuildNotificationJob[];
    history: GuildNotificationJob[];
  };
};

export type GuildNotificationRulesResponse = {
  items: GuildNotificationRule[];
  limits: GuildNotificationsResponse["limits"];
};

export type GuildAvailableNotificationTargetsResponse = {
  channels: DiscordGuildChannelSnapshot[];
  syncState: DiscordGuildSyncState | null;
};

export type CreateGuildNotificationTargetData = {
  externalId: string;
  displayName?: string | null;
};

export type UpdateGuildNotificationTargetData = {
  targetId: number;
  displayName?: string | null;
  active?: boolean;
};

export type DeleteGuildNotificationTargetData = {
  targetId: number;
};

export type CreateGuildNotificationRuleData = {
  name?: string | null;
  contentTemplate?: string | null;
  triggerType: NotificationTriggerType;
  world?: string | null;
  npcId?: number;
  npcIds?: number[];
  scheduleStrategy?: NotificationScheduleStrategy;
  scheduleAnchor?: NotificationScheduleAnchor;
  scheduleOffsetMinutes?: number;
  scheduledAt?: string;
  scheduleIntervalType?: NotificationScheduleIntervalType;
  scheduleIntervalValue?: number;
  scheduleWeekday?: number;
  scheduleTimeOfDay?: string;
  scheduledUntil?: string;
  scheduleTimezone?: string;
  targetIds: number[];
  enabled?: boolean;
};

export type UpdateGuildNotificationRuleData = {
  ruleId: number;
  name?: string | null;
  contentTemplate?: string | null;
  triggerType?: NotificationTriggerType;
  world?: string | null;
  npcId?: number;
  npcIds?: number[];
  scheduleStrategy?: NotificationScheduleStrategy;
  scheduleAnchor?: NotificationScheduleAnchor;
  scheduleOffsetMinutes?: number;
  scheduledAt?: string;
  scheduleIntervalType?: NotificationScheduleIntervalType;
  scheduleIntervalValue?: number;
  scheduleWeekday?: number;
  scheduleTimeOfDay?: string;
  scheduledUntil?: string;
  scheduleTimezone?: string;
  targetIds?: number[];
  enabled?: boolean;
};

export type DeleteGuildNotificationRuleData = {
  ruleId: number;
};

export type CancelGuildNotificationJobData = {
  jobId: string;
};

export type RebuildGuildNotificationRuleJobsData = {
  ruleId: number;
};

export type TriggerGuildNotificationRuleTestData = {
  ruleId: number;
};

type UseGuildNotificationJobsOptions = {
  pollPendingJobs?: boolean;
};

const createGuildNotificationsQueryKey = (guildId: string) =>
  queryKeys.guilds.notifications(guildId);

const createGuildNotificationJobsQueryKey = (guildId: string) =>
  queryKeys.guilds.notificationJobs(guildId);

const createGuildAvailableNotificationTargetsQueryKey = (guildId: string) =>
  queryKeys.guilds.notificationAvailableTargets(guildId);

const invalidateGuildNotificationQueries = async (
  guildId: string,
  queryClient: QueryClient,
) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: createGuildNotificationsQueryKey(guildId),
    }),
    queryClient.invalidateQueries({
      queryKey: createGuildNotificationJobsQueryKey(guildId),
    }),
    queryClient.invalidateQueries({
      queryKey: createGuildAvailableNotificationTargetsQueryKey(guildId),
    }),
  ]);
};

export const guildNotificationsQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: createGuildNotificationsQueryKey(guildId),
    queryFn: async () => {
      const [targetsResponse, rulesResponse] = await Promise.all([
        apiClient.get<GuildNotificationTarget[]>(
          `/guilds/${guildId}/notifications/targets`,
        ),
        apiClient.get<GuildNotificationRulesResponse>(
          `/guilds/${guildId}/notifications/rules`,
        ),
      ]);

      return {
        targets: targetsResponse,
        rules: rulesResponse.items,
        limits: rulesResponse.limits,
      };
    },
    enabled: guildId.length > 0,
  });

export const guildNotificationJobsQueryOptions = (guildId: string) =>
  queryOptions({
    queryKey: createGuildNotificationJobsQueryKey(guildId),
    queryFn: async () => {
      const response = await apiClient.get<GuildNotificationsResponse["jobs"]>(
        `/guilds/${guildId}/notifications/jobs`,
      );

      return response;
    },
    enabled: guildId.length > 0,
  });

export const guildAvailableNotificationTargetsQueryOptions = (
  guildId: string,
  enabled = true,
) =>
  queryOptions({
    queryKey: createGuildAvailableNotificationTargetsQueryKey(guildId),
    queryFn: async () => {
      const response =
        await apiClient.get<GuildAvailableNotificationTargetsResponse>(
          `/guilds/${guildId}/notifications/targets/available`,
        );

      return response;
    },
    enabled: guildId.length > 0 && enabled,
  });

export const useGuildNotifications = () => {
  const guildId = useGuildId();

  return useQuery(guildNotificationsQueryOptions(guildId ?? ""));
};

export const useGuildNotificationJobs = (
  options: UseGuildNotificationJobsOptions = {},
) => {
  const guildId = useGuildId();

  return useQuery({
    ...guildNotificationJobsQueryOptions(guildId ?? ""),
    refetchInterval: (query) => {
      if (!options.pollPendingJobs) {
        return false;
      }

      const data = query.state.data;

      if (!data || data.pending.length === 0) {
        return false;
      }

      return 5000;
    },
  });
};

export const useGuildAvailableNotificationTargets = (enabled = true) => {
  const guildId = useGuildId();

  return useQuery({
    ...guildAvailableNotificationTargetsQueryOptions(guildId ?? "", enabled),
  });
};

export const useCreateGuildNotificationTarget = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGuildNotificationTargetData) => {
      const response = await apiClient.post<GuildNotificationTarget>(
        `/guilds/${guildId}/notifications/targets`,
        {
          targetType: NotificationTargetTypeEnum.CHANNEL,
          externalId: data.externalId,
          displayName: data.displayName,
        },
      );

      return response;
    },
    onSuccess: async () => {
      await invalidateGuildNotificationQueries(guildId ?? "", queryClient);
    },
  });
};

export const useUpdateGuildNotificationTarget = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      targetId,
      displayName,
      active,
    }: UpdateGuildNotificationTargetData) => {
      const response = await apiClient.patch<GuildNotificationTarget>(
        `/guilds/${guildId}/notifications/targets/${targetId}`,
        {
          displayName,
          active,
        },
      );

      return response;
    },
    onSuccess: async () => {
      await invalidateGuildNotificationQueries(guildId ?? "", queryClient);
    },
  });
};

export const useDeleteGuildNotificationTarget = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetId }: DeleteGuildNotificationTargetData) => {
      const response = await apiClient.delete(
        `/guilds/${guildId}/notifications/targets/${targetId}`,
      );

      return response;
    },
    onSuccess: async () => {
      await invalidateGuildNotificationQueries(guildId ?? "", queryClient);
    },
  });
};

export const useCreateGuildNotificationRule = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateGuildNotificationRuleData) => {
      const response = await apiClient.post<GuildNotificationRule>(
        `/guilds/${guildId}/notifications/rules`,
        data,
      );

      return response;
    },
    onSuccess: async () => {
      await invalidateGuildNotificationQueries(guildId ?? "", queryClient);
    },
  });
};

export const useUpdateGuildNotificationRule = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ruleId,
      ...data
    }: UpdateGuildNotificationRuleData) => {
      const response = await apiClient.patch<GuildNotificationRule>(
        `/guilds/${guildId}/notifications/rules/${ruleId}`,
        data,
      );

      return response;
    },
    onSuccess: async () => {
      await invalidateGuildNotificationQueries(guildId ?? "", queryClient);
    },
  });
};

export const useDeleteGuildNotificationRule = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId }: DeleteGuildNotificationRuleData) => {
      const response = await apiClient.delete(
        `/guilds/${guildId}/notifications/rules/${ruleId}`,
      );

      return response;
    },
    onSuccess: async () => {
      await invalidateGuildNotificationQueries(guildId ?? "", queryClient);
    },
  });
};

export const useCancelGuildNotificationJob = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId }: CancelGuildNotificationJobData) => {
      const response = await apiClient.delete(
        `/guilds/${guildId}/notifications/jobs/${jobId}`,
      );

      return response;
    },
    onSuccess: async () => {
      await invalidateGuildNotificationQueries(guildId ?? "", queryClient);
    },
  });
};

export const useRebuildGuildNotificationRuleJobs = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId }: RebuildGuildNotificationRuleJobsData) => {
      const response = await apiClient.post(
        `/guilds/${guildId}/notifications/rules/${ruleId}/rebuild-jobs`,
      );

      return response;
    },
    onSuccess: async () => {
      await invalidateGuildNotificationQueries(guildId ?? "", queryClient);
    },
  });
};

export const useTriggerGuildNotificationRuleTest = () => {
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ruleId }: TriggerGuildNotificationRuleTestData) => {
      const response = await apiClient.post(
        `/guilds/${guildId}/notifications/rules/${ruleId}/test`,
      );

      return response;
    },
    onSuccess: async () => {
      await invalidateGuildNotificationQueries(guildId ?? "", queryClient);
    },
  });
};
