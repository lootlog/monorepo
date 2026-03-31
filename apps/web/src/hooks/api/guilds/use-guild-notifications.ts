import { useGuildId } from "@/hooks/context/use-guild-id";
import { apiClient } from "@/lib/api-client/api-client";
import type {
  DiscordGuildChannelSnapshot,
  DiscordGuildSyncState,
  NotificationFilters,
  NotificationJobStatus,
  NotificationTargetType,
  NotificationTriggerType,
} from "@lootlog/types";
import { NotificationTargetType as NotificationTargetTypeEnum } from "@lootlog/types";
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
  triggerType: NotificationTriggerType;
  world: string | null;
  leadTimeMinutes: number | null;
  enabled: boolean;
  updatedAt: string;
  filters: NotificationFilters | null;
  targets: Array<{
    target: GuildNotificationTarget;
  }>;
};

export type GuildNotificationJob = {
  id: string;
  scheduledFor: string;
  status: NotificationJobStatus;
  lastError: string | null;
  blockedReason: string | null;
  processedAt: string | null;
  updatedAt: string;
  rule: {
    id: number;
    name: string | null;
    triggerType: NotificationTriggerType;
  };
  target: GuildNotificationTarget;
};

export type GuildNotificationsResponse = {
  targets: GuildNotificationTarget[];
  rules: GuildNotificationRule[];
  jobs: {
    pending: GuildNotificationJob[];
    history: GuildNotificationJob[];
  };
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
  triggerType: NotificationTriggerType;
  world?: string | null;
  npcId?: number;
  npcIds?: number[];
  leadTimeMinutes?: number;
  targetIds: number[];
  enabled?: boolean;
};

export type UpdateGuildNotificationRuleData = {
  ruleId: number;
  name?: string | null;
  triggerType?: NotificationTriggerType;
  world?: string | null;
  npcId?: number;
  npcIds?: number[];
  leadTimeMinutes?: number;
  targetIds?: number[];
  enabled?: boolean;
};

export type DeleteGuildNotificationRuleData = {
  ruleId: number;
};

const createGuildNotificationsQueryKey = (guildId: string) =>
  ["guild-notifications", guildId] as const;

const createGuildAvailableNotificationTargetsQueryKey = (guildId: string) =>
  ["guild-notification-available-targets", guildId] as const;

const invalidateGuildNotificationQueries = async (
  guildId: string,
  queryClient: QueryClient,
) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: createGuildNotificationsQueryKey(guildId),
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
      const [targetsResponse, rulesResponse, jobsResponse] = await Promise.all([
        apiClient.get<GuildNotificationTarget[]>(
          `/guilds/${guildId}/notifications/targets`,
        ),
        apiClient.get<GuildNotificationRule[]>(
          `/guilds/${guildId}/notifications/rules`,
        ),
        apiClient.get<GuildNotificationsResponse["jobs"]>(
          `/guilds/${guildId}/notifications/jobs`,
        ),
      ]);

      return {
        targets: targetsResponse.data,
        rules: rulesResponse.data,
        jobs: jobsResponse.data,
      } satisfies GuildNotificationsResponse;
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

      return response.data;
    },
    enabled: guildId.length > 0 && enabled,
  });

export const useGuildNotifications = () => {
  const guildId = useGuildId();

  return useQuery({
    ...guildNotificationsQueryOptions(guildId ?? ""),
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

      return response.data;
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

      return response.data;
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

      return response.data;
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

      return response.data;
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

      return response.data;
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

      return response.data;
    },
    onSuccess: async () => {
      await invalidateGuildNotificationQueries(guildId ?? "", queryClient);
    },
  });
};
