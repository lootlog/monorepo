import { apiClient } from "@/lib/api-client/api-client";
import type {
  NotificationFilters,
  NotificationTargetType,
} from "@lootlog/types";
import { NotificationTargetType as NotificationTargetTypeEnum } from "@lootlog/types";
import {
  type QueryClient,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

export type UserNotificationTarget = {
  id: number;
  externalId: string;
  displayName: string | null;
  targetType: NotificationTargetType;
  active: boolean;
  canSend: boolean;
  updatedAt: string;
};

export type UserWatchedItem = {
  id: number;
  itemId: number;
  itemName: string;
  itemIcon: string;
  world: string;
  enabled: boolean;
  updatedAt: string;
  notificationRule: {
    id: number;
    world: string | null;
    enabled: boolean;
    filters: NotificationFilters | null;
    targets: Array<{
      target: UserNotificationTarget;
    }>;
  } | null;
};

export type UserNotificationsResponse = {
  targets: UserNotificationTarget[];
  watchedItems: UserWatchedItem[];
};

export type CreateUserNotificationTargetData = {
  displayName?: string | null;
};

export type UpdateUserNotificationTargetData = {
  targetId: number;
  displayName?: string | null;
  active?: boolean;
};

export type CreateWatchedItemData = {
  itemId: number;
  itemName: string;
  itemIcon: string;
  world: string;
  guildIds: string[];
};

export type DeleteWatchedItemData = {
  watchedItemId: number;
};

export type TriggerUserNotificationTargetTestData = {
  targetId: number;
};

export type QuickAddWatchedItemData = {
  itemId: number;
  itemName: string;
  itemIcon: string;
  world: string;
  guildId: string;
};

const createUserNotificationsQueryKey = () => ["user-notifications"] as const;

const invalidateUserNotificationQueries = async (queryClient: QueryClient) => {
  await queryClient.invalidateQueries({
    queryKey: createUserNotificationsQueryKey(),
  });
};

export const userNotificationsQueryOptions = () =>
  queryOptions({
    queryKey: createUserNotificationsQueryKey(),
    queryFn: async () => {
      const [targetsResponse, watchedItemsResponse] = await Promise.all([
        apiClient.get<UserNotificationTarget[]>(
          "/users/@me/notifications/targets",
        ),
        apiClient.get<UserWatchedItem[]>(
          "/users/@me/notifications/watched-items",
        ),
      ]);

      return {
        targets: targetsResponse.data,
        watchedItems: watchedItemsResponse.data,
      };
    },
  });

export const useUserNotifications = () => {
  return useQuery({
    ...userNotificationsQueryOptions(),
  });
};

export const useCreateUserNotificationTarget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserNotificationTargetData = {}) => {
      const response = await apiClient.post<UserNotificationTarget>(
        "/users/@me/notifications/targets",
        {
          targetType: NotificationTargetTypeEnum.DM,
          ...data,
        },
      );

      return response.data;
    },
    onSuccess: async () => {
      await invalidateUserNotificationQueries(queryClient);
    },
  });
};

export const useUpdateUserNotificationTarget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserNotificationTargetData) => {
      const response = await apiClient.patch<UserNotificationTarget>(
        `/users/@me/notifications/targets/${data.targetId}`,
        {
          displayName: data.displayName,
          active: data.active,
        },
      );

      return response.data;
    },
    onSuccess: async () => {
      await invalidateUserNotificationQueries(queryClient);
    },
  });
};

export const useCreateWatchedItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWatchedItemData) => {
      const response = await apiClient.post<UserWatchedItem>(
        "/users/@me/notifications/watched-items",
        data,
      );

      return response.data;
    },
    onSuccess: async () => {
      await invalidateUserNotificationQueries(queryClient);
    },
  });
};

export const useDeleteWatchedItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteWatchedItemData) => {
      const response = await apiClient.delete<{ success: true }>(
        `/users/@me/notifications/watched-items/${data.watchedItemId}`,
      );

      return response.data;
    },
    onSuccess: async () => {
      await invalidateUserNotificationQueries(queryClient);
    },
  });
};

export const useTriggerUserNotificationTargetTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TriggerUserNotificationTargetTestData) => {
      const response = await apiClient.post<{ success: true }>(
        `/users/@me/notifications/targets/${data.targetId}/test`,
      );

      return response.data;
    },
    onSuccess: async () => {
      await invalidateUserNotificationQueries(queryClient);
    },
  });
};

export const useQuickAddWatchedItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: QuickAddWatchedItemData) => {
      const response = await apiClient.post<UserWatchedItem>(
        "/users/@me/notifications/watched-items/quick-add",
        data,
      );

      return response.data;
    },
    onSuccess: async () => {
      await invalidateUserNotificationQueries(queryClient);
    },
  });
};
