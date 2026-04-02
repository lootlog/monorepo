import {
  type QuickAddWatchedItemData,
  type UserWatchedItem,
  useQuickAddWatchedItem,
  useUserNotifications,
} from "@/hooks/api/user/use-user-notifications";
import { createContext } from "react";
import type { PropsWithChildren } from "react";
import type { WatchedItemScope } from "@/features/user-notifications/types/watched-item-scope";

type GuildWatchedItemsContextValue = {
  state: "loading" | "error" | "ready";
  hasActiveDm: boolean;
  isQuickAddPending: boolean;
  quickAddWatchedItem: (
    data: QuickAddWatchedItemData,
  ) => Promise<UserWatchedItem>;
  isItemWatchedInScope: (itemId: number, scope: WatchedItemScope) => boolean;
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
        quickAddWatchedItem: quickAddWatchedItemMutation.mutateAsync,
        isItemWatchedInScope: (itemId, scope) =>
          watchedItems.some(
            (watchedItem) =>
              watchedItem.itemId === itemId &&
              watchedItem.world === scope.world &&
              getWatchedItemGuildIds(watchedItem).includes(scope.guildId),
          ),
      }}
    >
      {children}
    </GuildWatchedItemsContext.Provider>
  );
};
