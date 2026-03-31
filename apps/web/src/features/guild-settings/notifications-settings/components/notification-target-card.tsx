import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useDeleteGuildNotificationTarget,
  type GuildNotificationTarget,
} from "@/hooks/api/guilds/use-guild-notifications";
import { getApiErrorMessage } from "@/features/events/utils/get-api-error-message";
import { getGuildNotificationTargetLabel } from "../utils/notification-settings.utils";

type NotificationTargetCardProps = {
  target: GuildNotificationTarget;
  usageCount: number;
  actionsDisabled: boolean;
  onEdit: (target: GuildNotificationTarget) => void;
};

export const NotificationTargetCard = ({
  target,
  usageCount,
  actionsDisabled,
  onEdit,
}: NotificationTargetCardProps) => {
  const { t } = useTranslation();
  const deleteTarget = useDeleteGuildNotificationTarget();
  const isActionDisabled = actionsDisabled || deleteTarget.isPending;

  const handleDelete = async () => {
    try {
      await deleteTarget.mutateAsync({ targetId: target.id });
      toast.success(t("settings.notifications.toasts.targetDeleted"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.targetDeleteError"),
      );
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-background/30 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {getGuildNotificationTargetLabel(target)}
            </p>
            <p className="break-all text-xs text-muted-foreground">
              {target.externalId}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={target.active ? "default" : "outline"}>
              {target.active
                ? t("settings.notifications.states.active")
                : t("settings.notifications.states.inactive")}
            </Badge>
            <Badge variant={target.canSend ? "default" : "outline"}>
              {target.canSend
                ? t("settings.notifications.states.canSend")
                : t("settings.notifications.states.cannotSend")}
            </Badge>
            <Badge variant="outline">
              {t("settings.notifications.targetUsageCount", {
                count: usageCount,
              })}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isActionDisabled}
            onClick={() => onEdit(target)}
          >
            {t("settings.notifications.actions.edit")}
          </Button>
          <ConfirmDeleteDialog
            disabled={isActionDisabled}
            onConfirm={handleDelete}
            title={t("settings.notifications.deleteTargetDialog.title")}
            description={t(
              "settings.notifications.deleteTargetDialog.description",
              {
                name: getGuildNotificationTargetLabel(target),
              },
            )}
            confirmButtonLabel={t("settings.notifications.actions.delete")}
            cancelButtonLabel={t("settings.notifications.actions.cancel")}
            trigger={
              <Button type="button" size="sm" variant="outline">
                {t("settings.notifications.actions.delete")}
              </Button>
            }
          />
        </div>
      </div>
    </div>
  );
};
