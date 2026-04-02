import { BellOff, ShieldAlert, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { ItemImage } from "@/components/tiles";
import { getApiErrorMessage } from "@/features/events/utils/get-api-error-message";
import {
  type UserWatchedItem,
  useDeleteWatchedItem,
} from "@/hooks/api/user/use-user-notifications";
import { ItemRarity } from "@/hooks/api/loots/use-loots";

type WatchedItemCardProps = {
  watchedItem: UserWatchedItem;
  guildLabels: string[];
  missingGuildIds: string[];
};

export const WatchedItemCard = ({
  watchedItem,
  guildLabels,
  missingGuildIds,
}: WatchedItemCardProps) => {
  const { t } = useTranslation();
  const deleteWatchedItem = useDeleteWatchedItem();

  const handleDelete = async () => {
    try {
      await deleteWatchedItem.mutateAsync({ watchedItemId: watchedItem.id });
      toast.success(t("settings.userNotifications.toasts.watchDeleted"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.userNotifications.toasts.watchDeleteError"),
      );
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-background/30 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-3">
          <div className="flex min-w-0 items-center gap-3">
            <ItemImage icon={watchedItem.itemIcon} rarity={ItemRarity.COMMON} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {watchedItem.itemName}
              </p>
              <p className="text-xs text-muted-foreground">
                #{watchedItem.itemId} • {watchedItem.world}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={watchedItem.enabled ? "default" : "outline"}>
              {watchedItem.enabled
                ? t("settings.notifications.states.enabled")
                : t("settings.notifications.states.disabled")}
            </Badge>
            <Badge variant="outline">
              {t("settings.userNotifications.guildCount", {
                count: guildLabels.length + missingGuildIds.length,
              })}
            </Badge>
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
