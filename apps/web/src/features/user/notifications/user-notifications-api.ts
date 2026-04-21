import {
  getNotificationsUserControllerGetUserTargetsQueryOptions,
  getNotificationsUserControllerGetWatchedItemsQueryOptions,
} from "@/lib/api/generated/main/notifications/notifications";
import { queryKeys } from "@/lib/query-keys";
import type { QueryClient } from "@tanstack/react-query";

export const userNotificationTargetsQueryKey = () =>
  [...queryKeys.notifications.user(), "targets"] as const;

export const userWatchedItemsQueryKey = () =>
  [...queryKeys.notifications.user(), "watched-items"] as const;

export const userNotificationTargetsQueryOptions = () =>
  getNotificationsUserControllerGetUserTargetsQueryOptions({
    query: {
      queryKey: userNotificationTargetsQueryKey(),
    },
  });

export const userWatchedItemsQueryOptions = () =>
  getNotificationsUserControllerGetWatchedItemsQueryOptions({
    query: {
      queryKey: userWatchedItemsQueryKey(),
    },
  });

export const invalidateUserNotificationQueries = async (
  queryClient: QueryClient,
) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: userNotificationTargetsQueryKey(),
    }),
    queryClient.invalidateQueries({
      queryKey: userWatchedItemsQueryKey(),
    }),
  ]);
};
