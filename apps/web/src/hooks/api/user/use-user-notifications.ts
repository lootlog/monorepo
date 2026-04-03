import type {
  NotificationFilters,
  NotificationTargetType,
} from "@lootlog/types";
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { QueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client/api-client";

export type UserNotificationTargetTestTrigger = {
  limit: number;
  used: number;
  remaining: number;
  windowSeconds: number;
  nextAvailableAt: string | null;
};

export type UserNotificationTarget = {
  id: number;
  externalId: string;
  displayName: string | null;
  targetType: NotificationTargetType;
  active: boolean;
  canSend: boolean;
  updatedAt: string;
  testTrigger: UserNotificationTargetTestTrigger;
};

export type UserWatchedItemSnapshot = {
  name: string;
  icon: string;
  rarity: string | null;
  lvl: number | null;
  type: string | null;
  stat: string;
};

export type UserWatchedItem = {
  id: number;
  itemId: number;
  itemName: string;
  itemIcon: string | null;
  itemSnapshot: UserWatchedItemSnapshot | null;
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

export const createUserNotificationsQueryKey = () =>
  ["user-notifications"] as const;

export const invalidateUserNotificationQueries = async (
  queryClient: QueryClient,
) => {
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
