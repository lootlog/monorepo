import {
  getNotificationsUserControllerGetUserTargetsQueryKey,
  getNotificationsUserControllerGetWatchedItemsQueryKey,
  invalidateNotificationsUserControllerGetUserTargets,
  invalidateNotificationsUserControllerGetWatchedItems,
  useNotificationsUserControllerGetUserTargets,
  useNotificationsUserControllerGetWatchedItems,
  useNotificationsUserControllerQuickAddWatchedItem,
} from "@/lib/api/generated/main/notifications/notifications";
import type {
  CreateWatchedItemQuickAddDto,
  WatchedItemResponseDto,
} from "@/lib/api/generated/main/model";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, type PropsWithChildren } from "react";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useGuildsControllerGetGuildById } from "@/lib/api/generated/main/guilds/guilds";

type GuildWatchedItemsContextValue = {
  state: "loading" | "error" | "ready";
  hasActiveDm: boolean;
  isQuickAddPending: boolean;
  watchedItemsCount: number;
  quickAddWatchedItem: (
    data: CreateWatchedItemQuickAddDto,
  ) => Promise<WatchedItemResponseDto>;
  hasWatchedItem: (itemId: number, world: string) => boolean;
  isItemWatchedInScope: (itemId: number, scope: WatchedItemScope) => boolean;
  getWatchedItemId: (itemId: number, scope: WatchedItemScope) => number | null;
};

const getWatchedItemGuildIds = (
  watchedItem: WatchedItemResponseDto,
): string[] => watchedItem.notificationRule?.filters?.guildIds ?? [];

export const GuildWatchedItemsContext =
  createContext<GuildWatchedItemsContextValue | null>(null);

GuildWatchedItemsContext.displayName = "GuildWatchedItemsContext";

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
          await Promise.all([
            invalidateNotificationsUserControllerGetUserTargets(queryClient),
            invalidateNotificationsUserControllerGetWatchedItems(queryClient),
          ]);
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
