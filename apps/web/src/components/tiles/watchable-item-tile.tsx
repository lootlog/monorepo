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
import { useQueryClient } from "@tanstack/react-query";
import {
  invalidateNotificationsUserControllerGetUserTargets,
  invalidateNotificationsUserControllerGetWatchedItems,
  useNotificationsUserControllerDeleteWatchedItem,
} from "@lootlog/client/main";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  BellOff,
  Check,
  Copy,
  ListFilter,
  LoaderCircle,
  Plus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { formatItemHid } from "@/lib/utils/hid-detection";
import { cn } from "@lootlog/ui/lib/utils";

type WatchableItemTileProps = ItemTileProps & {
  watchContext: WatchedItemScope;
  selectedItemNames?: string[];
};

const getWatchableItemState = ({
  currentGuildId,
  hasActiveDm,
  isQuickAddPending,
  isRemovePending,
  itemId,
  state,
  watchContext,
  watchedItemsCount,
  hasWatchedItem,
  isItemWatchedInScope,
}: {
  currentGuildId: string | undefined;
  hasActiveDm: boolean;
  isQuickAddPending: boolean;
  isRemovePending: boolean;
  itemId: number;
  state: "error" | "loading" | "ready";
  watchContext: WatchedItemScope;
  watchedItemsCount: number;
  hasWatchedItem: (itemId: number, world: string) => boolean;
  isItemWatchedInScope: (itemId: number, scope: WatchedItemScope) => boolean;
}) => {
  const effectiveGuildId = watchContext.guildId || currentGuildId || "";
  const effectiveWatchContext = {
    guildId: effectiveGuildId,
    world: watchContext.world,
  };
  const isReady = state === "ready";
  const isWatched =
    isReady &&
    effectiveGuildId.length > 0 &&
    isItemWatchedInScope(itemId, effectiveWatchContext);
  const wouldCreate = isReady && !hasWatchedItem(itemId, watchContext.world);
  const limitReached =
    isReady && watchedItemsCount >= USER_WATCHED_ITEMS_LIMIT && wouldCreate;

  return {
    effectiveGuildId,
    effectiveWatchContext,
    isWatchedItemLimitReached: limitReached,
    isWatchedInScope: isWatched,
    showAddAction: isReady && hasActiveDm && !isWatched,
    showDmRequired: isReady && !hasActiveDm,
    showPending: state === "loading" || isQuickAddPending || isRemovePending,
    showRemoveAction: isReady && hasActiveDm && isWatched,
    wouldCreateNewWatchedItem: wouldCreate,
  };
};

export const WatchableItemTile = ({
  item,
  color,
  shareIndex,
  shareNickname,
  watchContext,
  selectedItemNames = [],
}: WatchableItemTileProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
  const deleteWatchedItem = useNotificationsUserControllerDeleteWatchedItem({
    mutation: {
      onSuccess: async () => {
        await Promise.all([
          invalidateNotificationsUserControllerGetUserTargets(queryClient),
          invalidateNotificationsUserControllerGetWatchedItems(queryClient),
        ]);
      },
    },
  });
  const isRemovePending = deleteWatchedItem.isPending;
  const {
    effectiveGuildId,
    effectiveWatchContext,
    isWatchedItemLimitReached,
    isWatchedInScope,
    showAddAction,
    showDmRequired,
    showPending,
    showRemoveAction,
    wouldCreateNewWatchedItem,
  } = getWatchableItemState({
    currentGuildId,
    hasActiveDm,
    hasWatchedItem,
    isItemWatchedInScope,
    isQuickAddPending,
    isRemovePending,
    itemId: item.id,
    state,
    watchContext,
    watchedItemsCount,
  });
  const formattedItemHid = formatItemHid(item.hid, watchContext.world);
  const hasItemFilter = selectedItemNames.length > 0;
  const isItemSelected = selectedItemNames.includes(item.name);

  const openNotifications = () => {
    void navigate({ to: ROUTES.user.notifications.base });
  };

  const handleCopyItemId = async () => {
    try {
      await navigator.clipboard.writeText(formattedItemHid);
      toast.success(t("loots.details.copySuccess"));
    } catch {
      toast.error(t("loots.details.copyError"));
    }
  };

  const showLootsWithItem = () => {
    if (!effectiveGuildId) {
      return;
    }

    void navigate({
      to: ROUTES.guild.lootlog(effectiveGuildId),
      search: { itemNames: [item.name] },
    });
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
      await deleteWatchedItem.mutateAsync({
        pathParams: { watchedItemId },
      });

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
      <ContextMenuTrigger
        render={
          <span
            className={cn(
              "relative inline-flex rounded-lg transition-[opacity,filter] duration-200",
              hasItemFilter && !isItemSelected && "opacity-35 grayscale-[0.45]",
            )}
            tabIndex={0}
            role="button"
          >
            <ItemTile
              item={item}
              color={color}
              shareIndex={shareIndex}
              shareNickname={shareNickname}
            />
            {hasItemFilter && isItemSelected ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -left-1 -top-1 z-10 flex size-4 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-2 ring-background"
              >
                <Check className="size-2.5" />
              </span>
            ) : null}
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
        }
      />
      <ContextMenuContent className="min-w-[15rem]">
        <ContextMenuItem
          className="gap-2"
          onClick={() => {
            void handleCopyItemId();
          }}
        >
          <Copy className="h-4 w-4 text-muted-foreground" />
          {t("loots.list.itemActions.copyId")}
        </ContextMenuItem>
        <ContextMenuItem
          className="gap-2"
          disabled={!effectiveGuildId}
          onClick={showLootsWithItem}
        >
          <ListFilter className="h-4 w-4 text-primary" />
          {t("loots.list.itemActions.showLoots")}
        </ContextMenuItem>
        <ContextMenuSeparator />
        {showPending ? (
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
            <ContextMenuItem onClick={openNotifications}>
              {t("settings.userNotifications.quickAdd.openNotifications")}
            </ContextMenuItem>
          </>
        ) : null}
        {showDmRequired ? (
          <>
            <ContextMenuItem disabled>
              {t("settings.userNotifications.quickAdd.dmRequired")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={openNotifications}>
              {t("settings.userNotifications.quickAdd.configureDm")}
            </ContextMenuItem>
          </>
        ) : null}
        {showRemoveAction ? (
          <>
            <ContextMenuItem
              className="gap-2"
              onClick={() => {
                void handleRemove();
              }}
            >
              <BellOff className="h-4 w-4 text-muted-foreground" />
              {t("settings.userNotifications.quickAdd.remove")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={openNotifications}>
              {t("settings.userNotifications.quickAdd.openNotifications")}
            </ContextMenuItem>
          </>
        ) : null}
        {showAddAction ? (
          isWatchedItemLimitReached ? (
            <>
              <ContextMenuItem disabled>
                {t("settings.userNotifications.quickAdd.limitReached", {
                  limit: USER_WATCHED_ITEMS_LIMIT,
                })}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={openNotifications}>
                {t("settings.userNotifications.quickAdd.openNotifications")}
              </ContextMenuItem>
            </>
          ) : (
            <ContextMenuItem
              className="gap-2"
              onClick={() => {
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
