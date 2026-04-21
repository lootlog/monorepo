import {
  useNotificationsUserControllerGetUserTargets,
  useNotificationsUserControllerGetWatchedItems,
  useNotificationsUserControllerQuickAddWatchedItem,
} from "@/lib/api/generated/main/notifications/notifications";
import type {
  CreateWatchedItemQuickAddDto,
  WatchedItemResponseDtoOutput,
} from "@/lib/api/generated/main/model";
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateUserNotificationQueries,
  userNotificationTargetsQueryKey,
  userWatchedItemsQueryKey,
} from "../user-notifications-api";
import { createContext, type PropsWithChildren } from "react";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { useGuild } from "@/hooks/api/guilds/use-guild";
import { useGuildId } from "@/hooks/context/use-guild-id";

type GuildWatchedItemsContextValue = {
  state: "loading" | "error" | "ready";
  hasActiveDm: boolean;
  isQuickAddPending: boolean;
  watchedItemsCount: number;
  quickAddWatchedItem: (
    data: CreateWatchedItemQuickAddDto,
  ) => Promise<WatchedItemResponseDtoOutput>;
  hasWatchedItem: (itemId: number, world: string) => boolean;
  isItemWatchedInScope: (itemId: number, scope: WatchedItemScope) => boolean;
  getWatchedItemId: (itemId: number, scope: WatchedItemScope) => number | null;
};

const getWatchedItemGuildIds = (
  watchedItem: WatchedItemResponseDtoOutput,
): string[] => watchedItem.notificationRule?.filters?.guildIds ?? [];

export const GuildWatchedItemsContext =
  createContext<GuildWatchedItemsContextValue | null>(null);

GuildWatchedItemsContext.displayName = "GuildWatchedItemsContext";

export const GuildWatchedItemsProvider = ({ children }: PropsWithChildren) => {
  const queryClient = useQueryClient();
  const targetsQuery = useNotificationsUserControllerGetUserTargets({
    query: { queryKey: userNotificationTargetsQueryKey() },
  });
  const watchedItemsQuery = useNotificationsUserControllerGetWatchedItems({
    query: { queryKey: userWatchedItemsQueryKey() },
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
  const guildQuery = useGuild();
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
              getWatchedItemGuildIds(watchedItem).includes(guildId),
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
                getWatchedItemGuildIds(watchedItem).includes(guildId),
            )?.id ?? null
          );
        },
      }}
    >
      {children}
    </GuildWatchedItemsContext.Provider>
  );
};
