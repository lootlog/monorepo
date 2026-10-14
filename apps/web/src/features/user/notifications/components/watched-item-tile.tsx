import { upperFirst } from "es-toolkit";
import { invalidateUserNotificationQueries } from "@/features/user/notifications/utils/invalidate-user-notification-queries";
import { Globe, Hash, Trash2, TriangleAlert, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "cn";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { ItemImage } from "@lootlog/ui/components/item-image";
import { resolveItemRarity } from "@lootlog/ui/lib/item-rarity";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { MetaItem } from "@/components/common/meta-item";
import { ItemTile } from "@/components/tiles";
import { getUserNotificationsErrorMessage } from "@/features/user/notifications/utils/get-user-notifications-error-message";
import { useQueryClient } from "@tanstack/react-query";
import {
  useNotificationsUserControllerDeleteWatchedItem,
  type WatchedItemResponseDto,
} from "@lootlog/client/main";

import { ItemRarity } from "@/lib/loots/loot-types";

type WatchedItemTileProps = {
  watchedItem: WatchedItemResponseDto;
  guildLabels: string[];
  missingGuildIds: string[];
};

/**
 * One watched item: where it is watched and a way to stop. A watch that still
 * names a Lootlog the player lost access to is tinted until they fix it.
 */
export const WatchedItemTile = ({
  watchedItem,
  guildLabels,
  missingGuildIds,
}: WatchedItemTileProps) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const deleteWatchedItem = useNotificationsUserControllerDeleteWatchedItem({
    mutation: {
      onSuccess: async () => {
        await invalidateUserNotificationQueries(queryClient);
      },
    },
  });

  const handleDelete = async () => {
    try {
      await deleteWatchedItem.mutateAsync({
        pathParams: { watchedItemId: watchedItem.id },
      });
      toast.success(t("settings.userNotifications.toasts.watchDeleted"));
    } catch (error) {
      toast.error(
        getUserNotificationsErrorMessage(error, t) ??
          t("settings.userNotifications.toasts.watchDeleteError"),
      );
      throw error;
    }
  };

  const snapshot = watchedItem.itemSnapshot;
  const rarity = resolveItemRarity(snapshot?.rarity);
  const apiRarity = rarity === ItemRarity.COMMON ? null : rarity;
  const displayName = snapshot?.name ?? watchedItem.itemName;
  const displayIcon = snapshot?.icon ?? null;
  const hasMissingGuilds = missingGuildIds.length > 0;

  const guildNames = [
    ...guildLabels,
    ...missingGuildIds.map((guildId) =>
      t("settings.userNotifications.missingGuild", { guildId }),
    ),
  ];

  const renderItemVisual = () => {
    if (snapshot && displayIcon) {
      return (
        <ItemTile
          item={{
            name: displayName,
            icon: displayIcon,
            rarity: apiRarity,
            type: snapshot.type ?? "",
            stat: snapshot.stat,
          }}
        />
      );
    }

    if (displayIcon) {
      return <ItemImage icon={displayIcon} rarity={rarity} />;
    }

    return (
      <div className="size-[32px] rounded-md border-2 border-border/50 bg-muted/30" />
    );
  };

  return (
    <li data-list-tile className={LIST_TILE_RULE_CLASS}>
      <div
        className={cn(
          "flex items-center",
          hasMissingGuilds && "bg-signal-timer/[0.06]",
        )}
      >
        <div className={getListTileLinkClassName(true)}>
          {/* As wide as the tile icons the other lists lead with. */}
          <span className="flex size-9 shrink-0 items-center justify-center">
            {renderItemVisual()}
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-sm font-semibold">
              {displayName}
            </span>
            <span className="flex min-w-0 items-center gap-x-3">
              <MetaItem icon={Hash} className="shrink-0">
                {watchedItem.itemId}
              </MetaItem>
              <MetaItem icon={Globe} className="shrink-0">
                {upperFirst(watchedItem.world)}
              </MetaItem>
            </span>
            {/* Every watched Lootlog stays readable, so the line wraps. */}
            {guildNames.length > 0 && (
              <MetaItem
                icon={Users}
                label={t("settings.userNotifications.fields.guilds")}
                className="items-start whitespace-normal"
              >
                <span className="min-w-0 break-words">
                  {guildNames.join(", ")}
                </span>
              </MetaItem>
            )}
            {hasMissingGuilds && (
              <span className="flex items-center gap-1 text-xs text-signal-timer">
                <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
                {t("settings.userNotifications.staleGuildWarning")}
              </span>
            )}
          </span>
        </div>
        <div className={LIST_TILE_ACTIONS_CLASS}>
          <ConfirmDeleteDialog
            disabled={deleteWatchedItem.isPending}
            onConfirm={handleDelete}
            title={t("settings.userNotifications.deleteWatchDialog.title")}
            description={t(
              "settings.userNotifications.deleteWatchDialog.description",
              {
                itemName: watchedItem.itemName,
              },
            )}
            confirmButtonLabel={t("settings.notifications.actions.delete")}
            cancelButtonLabel={t("settings.notifications.actions.cancel")}
            triggerTooltip={t("settings.userNotifications.quickAdd.remove")}
            trigger={
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label={t(
                  "settings.userNotifications.actions.removeWatch",
                  {
                    itemName: displayName,
                  },
                )}
                loading={deleteWatchedItem.isPending}
              >
                <Trash2 className="size-4" />
              </Button>
            }
          />
        </div>
      </div>
    </li>
  );
};
