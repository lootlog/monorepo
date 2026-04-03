import type { QuickAddWatchedItemData } from "@/hooks/api/user/use-quick-add-watched-item";
import { useQuickAddWatchedItem } from "@/hooks/api/user/use-quick-add-watched-item";
import type { UserWatchedItem } from "@/hooks/api/user/use-user-notifications";
import { useUserNotifications } from "@/hooks/api/user/use-user-notifications";
import { createContext } from "react";
import type { PropsWithChildren } from "react";
import { USER_WATCHED_ITEMS_LIMIT } from "@/features/user-notifications/constants/user-watched-items-limit";
import type { WatchedItemScope } from "@/features/user-notifications/types/watched-item-scope";

type GuildWatchedItemsContextValue = {
  state: "loading" | "error" | "ready";
  hasActiveDm: boolean;
  isQuickAddPending: boolean;
  watchedItemsCount: number;
  quickAddWatchedItem: (
    data: QuickAddWatchedItemData,
  ) => Promise<UserWatchedItem>;
  hasWatchedItem: (itemId: number, world: string) => boolean;
  isItemWatchedInScope: (itemId: number, scope: WatchedItemScope) => boolean;
  getWatchedItemId: (itemId: number, scope: WatchedItemScope) => number | null;
};

const getWatchedItemGuildIds = (watchedItem: UserWatchedItem): string[] =>
  watchedItem.notificationRule?.filters?.guildIds ?? [];

export const GuildWatchedItemsContext =
  createContext<GuildWatchedItemsContextValue | null>(null);

GuildWatchedItemsContext.displayName = "GuildWatchedItemsContext";

export const GuildWatchedItemsProvider = ({ children }: PropsWithChildren) => {
  const notificationsQuery = useUserNotifications();
  const quickAddWatchedItemMutation = useQuickAddWatchedItem();
  const dmTarget =
    notificationsQuery.data?.targets.find(
      (target) => target.targetType === "DM",
    ) ?? null;
  const hasActiveDm = Boolean(dmTarget?.active && dmTarget.canSend);
  const watchedItems = notificationsQuery.data?.watchedItems ?? [];
  const state =
    notificationsQuery.data !== undefined
      ? "ready"
      : notificationsQuery.isError
        ? "error"
        : "loading";

  return (
    <GuildWatchedItemsContext.Provider
      value={{
        state,
        hasActiveDm,
        isQuickAddPending: quickAddWatchedItemMutation.isPending,
        watchedItemsCount: watchedItems.length,
        quickAddWatchedItem: quickAddWatchedItemMutation.mutateAsync,
        hasWatchedItem: (itemId, world) =>
          watchedItems.some(
            (watchedItem) =>
              watchedItem.itemId === itemId && watchedItem.world === world,
          ),
        isItemWatchedInScope: (itemId, scope) =>
          watchedItems.some(
            (watchedItem) =>
              watchedItem.itemId === itemId &&
              watchedItem.world === scope.world &&
              getWatchedItemGuildIds(watchedItem).includes(scope.guildId),
          ),
        getWatchedItemId: (itemId, scope) =>
          watchedItems.find(
            (watchedItem) =>
              watchedItem.itemId === itemId &&
              watchedItem.world === scope.world &&
              getWatchedItemGuildIds(watchedItem).includes(scope.guildId),
          )?.id ?? null,
      }}
    >
      {children}
    </GuildWatchedItemsContext.Provider>
  );
};
