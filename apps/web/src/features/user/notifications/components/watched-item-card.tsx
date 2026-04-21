import { BellOff, ShieldAlert, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { ItemImage, ItemTile } from "@/components/tiles";
import { getUserNotificationsErrorMessage } from "@/features/user/notifications/utils/get-user-notifications-error-message";
import { useQueryClient } from "@tanstack/react-query";
import { useNotificationsUserControllerDeleteWatchedItem } from "@/lib/api/generated/main/notifications/notifications";
import type { WatchedItemResponseDto } from "@/lib/api/generated/main/model";
import { ItemRarity } from "@/hooks/api/loots/use-loots";
import { invalidateUserNotificationQueries } from "../user-notifications-api";

type WatchedItemCardProps = {
  watchedItem: WatchedItemResponseDto;
  guildLabels: string[];
  missingGuildIds: string[];
};

export const WatchedItemCard = ({
  watchedItem,
  guildLabels,
  missingGuildIds,
}: WatchedItemCardProps) => {
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
    }
  };

  const snapshot = watchedItem.itemSnapshot;
  const rarity = (snapshot?.rarity as ItemRarity | null) ?? ItemRarity.COMMON;
  const displayName = snapshot?.name ?? watchedItem.itemName;
  const displayIcon = snapshot?.icon ?? null;

  const renderItemVisual = () => {
    if (snapshot && displayIcon) {
      return (
        <ItemTile
          item={{
            id: watchedItem.itemId,
            hid: "",
            name: displayName,
            icon: displayIcon,
            rarity,
            lvl: snapshot.lvl ?? 0,
            type: snapshot.type ?? "",
            stat: snapshot.stat,
            prof: [],
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
    <div className="rounded-xl border border-border/70 bg-background/30 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex min-w-0 items-center gap-3">
            {renderItemVisual()}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{displayName}</p>
              <p className="text-xs text-muted-foreground">
                #{watchedItem.itemId} • {watchedItem.world}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {guildLabels.map((label) => (
              <Badge key={label} variant="secondary">
                {label}
              </Badge>
            ))}
            {missingGuildIds.map((guildId) => (
              <Badge key={guildId} variant="outline">
                {t("settings.userNotifications.missingGuild", { guildId })}
              </Badge>
            ))}
          </div>
          {missingGuildIds.length > 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-amber-500">
              <ShieldAlert className="size-3.5 shrink-0" />
              {t("settings.userNotifications.staleGuildWarning")}
            </p>
          ) : null}
        </div>
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
          trigger={
            <Button
              type="button"
              size="icon"
              variant="destructive"
              aria-label={t("settings.notifications.actions.delete")}
              disabled={deleteWatchedItem.isPending}
            >
              {deleteWatchedItem.isPending ? (
                <BellOff className="h-4 w-4" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          }
        />
      </div>
    </div>
  );
};
