import { type ItemTileProps, ItemTile } from "@/components/tiles/item-tile";
import { ROUTES } from "@/config/routes";
import { USER_WATCHED_ITEMS_LIMIT } from "@/features/user/notifications/constants/user-watched-items-limit";
import { useGuildWatchedItems } from "@/features/user/notifications/hooks/use-guild-watched-items";
import type { WatchedItemScope } from "@/features/user/notifications/types/watched-item-scope";
import { getUserNotificationsErrorMessage } from "@/features/user/notifications/utils/get-user-notifications-error-message";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@lootlog/ui/components/context-menu";
import { useDeleteWatchedItem } from "@/hooks/api/user/use-delete-watched-item";
import { useNavigate } from "@tanstack/react-router";
import { Bell, BellOff, LoaderCircle, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type WatchableItemTileProps = ItemTileProps & {
  watchContext: WatchedItemScope;
};

export const WatchableItemTile = ({
  item,
  color,
  shareIndex,
  shareNickname,
  watchContext,
}: WatchableItemTileProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentGuildId = useGuildId();
  const {
    state,
    hasActiveDm,
    isQuickAddPending,
    watchedItemsCount,
    quickAddWatchedItem,
    hasWatchedItem,
    isItemWatchedInScope,
    getWatchedItemId,
  } = useGuildWatchedItems();
  const deleteWatchedItem = useDeleteWatchedItem();
  const effectiveGuildId = watchContext.guildId || currentGuildId || "";
  const effectiveWatchContext = {
    guildId: effectiveGuildId,
    world: watchContext.world,
  };
  const isWatchedInScope =
    state === "ready" &&
    effectiveGuildId.length > 0 &&
    isItemWatchedInScope(item.id, effectiveWatchContext);
  const wouldCreateNewWatchedItem =
    state === "ready" && !hasWatchedItem(item.id, watchContext.world);
  const isWatchedItemLimitReached =
    state === "ready" &&
    watchedItemsCount >= USER_WATCHED_ITEMS_LIMIT &&
    wouldCreateNewWatchedItem;

  const isRemovePending = deleteWatchedItem.isPending;

  const openNotifications = () => {
    void navigate({ to: ROUTES.user.notifications.base });
  };

  const handleRemove = async () => {
    const watchedItemId = getWatchedItemId(item.id, effectiveWatchContext);
    if (!watchedItemId) return;

    const loadingToastId = toast.loading(
      t("settings.userNotifications.quickAdd.toasts.removing", {
        itemName: item.name,
      }),
    );

    try {
      await deleteWatchedItem.mutateAsync({ watchedItemId });
      toast.success(
        t("settings.userNotifications.quickAdd.toasts.removed", {
          itemName: item.name,
        }),
        { id: loadingToastId },
      );
    } catch (error) {
      toast.error(
        getUserNotificationsErrorMessage(error, t) ??
          t("settings.userNotifications.quickAdd.toasts.removeError"),
        { id: loadingToastId },
      );
    }
  };

  const handleQuickAdd = async () => {
    if (!effectiveGuildId) {
      toast.error(t("settings.userNotifications.quickAdd.scopeUnavailable"));
      return;
    }

    if (isWatchedItemLimitReached) {
      toast.error(
        t("settings.userNotifications.validation.watchLimitReached", {
          limit: USER_WATCHED_ITEMS_LIMIT,
        }),
      );
      return;
    }

    const nextWatchedItemsCount = wouldCreateNewWatchedItem
      ? Math.min(watchedItemsCount + 1, USER_WATCHED_ITEMS_LIMIT)
      : watchedItemsCount;
    const loadingToastId = toast.loading(
      t("settings.userNotifications.quickAdd.toasts.adding", {
        itemName: item.name,
        count: nextWatchedItemsCount,
        limit: USER_WATCHED_ITEMS_LIMIT,
      }),
    );

    try {
      await quickAddWatchedItem({
        itemId: item.id,
        itemName: item.name,
        world: watchContext.world,
        guildId: effectiveGuildId,
      });
      toast.success(
        t("settings.userNotifications.quickAdd.toasts.added", {
          itemName: item.name,
          count: nextWatchedItemsCount,
          limit: USER_WATCHED_ITEMS_LIMIT,
        }),
        { id: loadingToastId },
      );
    } catch (error) {
      toast.error(
        getUserNotificationsErrorMessage(error, t) ??
          t("settings.userNotifications.quickAdd.toasts.error"),
        { id: loadingToastId },
      );
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <span className="relative inline-flex" tabIndex={0} role="button">
          <ItemTile
            item={item}
            color={color}
            shareIndex={shareIndex}
            shareNickname={shareNickname}
          />
          {isWatchedInScope ? (
            <span
              aria-hidden="true"
              title={t("settings.userNotifications.quickAdd.indicatorLabel")}
              className="pointer-events-none absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-background shadow-sm ring-2 ring-background"
            >
              <Bell className="size-2.5" />
            </span>
          ) : null}
        </span>
      </ContextMenuTrigger>
      <ContextMenuContent className="min-w-[15rem]">
        {state === "loading" || isQuickAddPending || isRemovePending ? (
          <ContextMenuItem disabled className="gap-2">
            <LoaderCircle className="h-4 w-4 animate-spin text-muted-foreground" />
            {t("settings.userNotifications.quickAdd.loading")}
          </ContextMenuItem>
        ) : null}
        {state === "error" ? (
          <>
            <ContextMenuItem disabled>
              {t("settings.userNotifications.quickAdd.loadError")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={openNotifications}>
              {t("settings.userNotifications.quickAdd.openNotifications")}
            </ContextMenuItem>
          </>
        ) : null}
        {state === "ready" && !hasActiveDm ? (
          <>
            <ContextMenuItem disabled>
              {t("settings.userNotifications.quickAdd.dmRequired")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={openNotifications}>
              {t("settings.userNotifications.quickAdd.configureDm")}
            </ContextMenuItem>
          </>
        ) : null}
        {state === "ready" && hasActiveDm && isWatchedInScope ? (
          <>
            <ContextMenuItem
              className="gap-2"
              onSelect={() => {
                void handleRemove();
              }}
            >
              <BellOff className="h-4 w-4 text-muted-foreground" />
              {t("settings.userNotifications.quickAdd.remove")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={openNotifications}>
              {t("settings.userNotifications.quickAdd.openNotifications")}
            </ContextMenuItem>
          </>
        ) : null}
        {state === "ready" && hasActiveDm && !isWatchedInScope ? (
          isWatchedItemLimitReached ? (
            <>
              <ContextMenuItem disabled>
                {t("settings.userNotifications.quickAdd.limitReached", {
                  limit: USER_WATCHED_ITEMS_LIMIT,
                })}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onSelect={openNotifications}>
                {t("settings.userNotifications.quickAdd.openNotifications")}
              </ContextMenuItem>
            </>
          ) : (
            <ContextMenuItem
              className="gap-2"
              onSelect={() => {
                void handleQuickAdd();
              }}
            >
              <Plus className="h-4 w-4 text-muted-foreground" />
              {t("settings.userNotifications.quickAdd.add")}
            </ContextMenuItem>
          )
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
};
