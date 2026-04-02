import { type ItemTileProps, ItemTile } from "@/components/tiles/item-tile";
import { ROUTES } from "@/config/routes";
import { getApiErrorMessage } from "@/features/events/utils/get-api-error-message";
import { useGuildWatchedItems } from "@/features/user-notifications/hooks/use-guild-watched-items";
import type { WatchedItemScope } from "@/features/user-notifications/types/watched-item-scope";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@lootlog/ui/components/context-menu";
import { useNavigate } from "@tanstack/react-router";
import { Bell, LoaderCircle, Plus } from "lucide-react";
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
    quickAddWatchedItem,
    isItemWatchedInScope,
  } = useGuildWatchedItems();
  const effectiveGuildId = watchContext.guildId || currentGuildId || "";
  const effectiveWatchContext = {
    guildId: effectiveGuildId,
    world: watchContext.world,
  };
  const isWatchedInScope =
    state === "ready" &&
    effectiveGuildId.length > 0 &&
    isItemWatchedInScope(item.id, effectiveWatchContext);

  const openNotifications = () => {
    void navigate({ to: ROUTES.user.notifications.base });
  };

  const handleQuickAdd = async () => {
    if (!effectiveGuildId) {
      toast.error(t("settings.userNotifications.quickAdd.scopeUnavailable"));
      return;
    }

    try {
      await quickAddWatchedItem({
        itemId: item.id,
        itemName: item.name,
        itemIcon: item.icon,
        world: watchContext.world,
        guildId: effectiveGuildId,
      });
      toast.success(
        t("settings.userNotifications.quickAdd.toasts.added", {
          itemName: item.name,
        }),
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.userNotifications.quickAdd.toasts.error"),
      );
    }
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <span className="relative inline-flex">
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
        {state === "loading" || isQuickAddPending ? (
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
            <ContextMenuItem disabled>
              {t("settings.userNotifications.quickAdd.watched")}
            </ContextMenuItem>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={openNotifications}>
              {t("settings.userNotifications.quickAdd.openNotifications")}
            </ContextMenuItem>
          </>
        ) : null}
        {state === "ready" && hasActiveDm && !isWatchedInScope ? (
          <ContextMenuItem
            className="gap-2"
            onSelect={() => {
              void handleQuickAdd();
            }}
          >
            <Plus className="h-4 w-4 text-muted-foreground" />
            {t("settings.userNotifications.quickAdd.add")}
          </ContextMenuItem>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
};
