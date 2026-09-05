import type { QueryClient } from "@tanstack/react-query";
import {
  invalidateNotificationsUserControllerGetUserTargets,
  invalidateNotificationsUserControllerGetWatchedItems,
} from "@lootlog/client/main";

export const invalidateUserNotificationQueries = (queryClient: QueryClient) =>
  Promise.all([
    invalidateNotificationsUserControllerGetUserTargets(queryClient),
    invalidateNotificationsUserControllerGetWatchedItems(queryClient),
  ]);
