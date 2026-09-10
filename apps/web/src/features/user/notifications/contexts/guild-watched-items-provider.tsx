/* eslint-disable react-doctor/jsx-no-constructed-context-values -- Vite React Compiler output caches this provider value and its callbacks by their actual dependencies; verified through the running Vite module transform. */
import { GuildWatchedItemsContext } from "./guild-watched-items-context";
import { invalidateUserNotificationQueries } from "@/features/user/notifications/utils/invalidate-user-notification-queries";
import {
  getNotificationsUserControllerGetUserTargetsQueryKey,
  getNotificationsUserControllerGetWatchedItemsQueryKey,
  useNotificationsUserControllerGetUserTargets,
  useNotificationsUserControllerGetWatchedItems,
  useNotificationsUserControllerQuickAddWatchedItem,
  type WatchedItemResponseDto,
  useGuildsControllerGetGuildById,
} from "@lootlog/client/main";

import { useQueryClient } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { useGuildId } from "@/hooks/context/use-guild-id";

const getWatchedItemGuildIds = (
  watchedItem: WatchedItemResponseDto,
): string[] => watchedItem.notificationRule?.filters?.guildIds ?? [];

export const GuildWatchedItemsProvider = ({ children }: PropsWithChildren) => {
  const queryClient = useQueryClient();

  const targetsQuery = useNotificationsUserControllerGetUserTargets({
    query: { queryKey: getNotificationsUserControllerGetUserTargetsQueryKey() },
  });

  const watchedItemsQuery = useNotificationsUserControllerGetWatchedItems({
    query: {
      queryKey: getNotificationsUserControllerGetWatchedItemsQueryKey(),
    },
  });

  const quickAddWatchedItemMutation =
    useNotificationsUserControllerQuickAddWatchedItem({
      mutation: {
        onSuccess: async () => {
          await invalidateUserNotificationQueries(queryClient);
        },
      },
    });

  const currentGuildId = useGuildId();

  const guildQuery = useGuildsControllerGetGuildById({
    guildId: currentGuildId ?? "",
  });

  const resolvedGuildId = guildQuery.data?.id;

  const resolveGuildId = (guildId: string): string => {
    if (resolvedGuildId && guildId === currentGuildId) {
      return resolvedGuildId;
    }

    return guildId;
  };

  const dmTarget =
    targetsQuery.data?.find((target) => target.targetType === "DM") ?? null;

  const hasActiveDm = Boolean(dmTarget?.active && dmTarget.canSend);
  const watchedItems = watchedItemsQuery.data ?? [];

  const watchedGuildIds = new Map(
    watchedItems.map((item) => [
      item.id,
      new Set(getWatchedItemGuildIds(item)),
    ]),
  );

  const state =
    targetsQuery.data !== undefined && watchedItemsQuery.data !== undefined
      ? "ready"
      : targetsQuery.isError || watchedItemsQuery.isError
        ? "error"
        : "loading";

  return (
    <GuildWatchedItemsContext.Provider
      value={{
        state,
        hasActiveDm,
        isQuickAddPending: quickAddWatchedItemMutation.isPending,
        watchedItemsCount: watchedItems.length,
        quickAddWatchedItem: (data) =>
          quickAddWatchedItemMutation.mutateAsync({ data }),
        hasWatchedItem: (itemId, world) =>
          watchedItems.some(
            (watchedItem) =>
              watchedItem.itemId === itemId && watchedItem.world === world,
          ),
        isItemWatchedInScope: (itemId, scope) => {
          const guildId = scope.guildId
            ? resolveGuildId(scope.guildId)
            : undefined;

          return watchedItems.some(
            (watchedItem) =>
              watchedItem.itemId === itemId &&
              watchedItem.world === scope.world &&
              guildId !== undefined &&
              watchedGuildIds.get(watchedItem.id)?.has(guildId) === true,
          );
        },
        getWatchedItemId: (itemId, scope) => {
          const guildId = scope.guildId
            ? resolveGuildId(scope.guildId)
            : undefined;

          return (
            watchedItems.find(
              (watchedItem) =>
                watchedItem.itemId === itemId &&
                watchedItem.world === scope.world &&
                guildId !== undefined &&
                watchedGuildIds.get(watchedItem.id)?.has(guildId) === true,
            )?.id ?? null
          );
        },
      }}
    >
      {children}
    </GuildWatchedItemsContext.Provider>
  );
};
