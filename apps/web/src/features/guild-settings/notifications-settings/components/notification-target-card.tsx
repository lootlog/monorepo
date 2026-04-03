import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Pencil, Trash2 } from "lucide-react";
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
    <div
      className={`rounded-xl border p-3 ${target.active ? "border-border/70 bg-background/30" : "border-amber-500/30 bg-amber-500/5 opacity-75"}`}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="min-w-0 truncate text-sm font-medium">
            {getGuildNotificationTargetLabel(target)}
            <span className="ml-1 text-xs font-normal text-muted-foreground">
              ({t(`settings.notifications.targetTypes.${target.targetType}`)}:{" "}
              {target.externalId})
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant={target.active ? "default" : "secondary"}>
              {target.active
                ? t("settings.notifications.states.active")
                : t("settings.notifications.states.inactive")}
            </Badge>
            <Badge variant={target.canSend ? "default" : "secondary"}>
              {target.canSend
                ? t("settings.notifications.states.canSend")
                : t("settings.notifications.states.cannotSend")}
            </Badge>
            <Badge variant="secondary">
              {t("settings.notifications.targetUsageCount", {
                count: usageCount,
              })}
            </Badge>
          </div>
        </div>
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={isActionDisabled}
                onClick={() => onEdit(target)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t("settings.notifications.actions.edit")}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
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
                  confirmButtonLabel={t(
                    "settings.notifications.actions.delete",
                  )}
                  cancelButtonLabel={t("settings.notifications.actions.cancel")}
                  trigger={
                    <Button type="button" size="icon" variant="destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  }
                />
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {t("settings.notifications.actions.delete")}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};
