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
import { useQueryClient } from "@tanstack/react-query";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  cancelGuildNotificationQueries,
  getGuildNotificationCacheSnapshot,
  invalidateGuildNotificationQueries,
  removeGuildNotificationTargetFromCache,
  restoreGuildNotificationCacheSnapshot,
  type GuildNotificationCacheSnapshot,
} from "../notifications-api";
import { getApiErrorMessage } from "@/features/guild/events/utils/get-api-error-message";
import { getGuildNotificationTargetLabel } from "../utils/notification-settings.utils";
import { useNotificationsGuildControllerDeleteGuildTarget } from "@/lib/api/generated/main/notifications/notifications";
import type { NotificationTargetResponseDto } from "@/lib/api/generated/main/model";

type NotificationTargetCardProps = {
  target: NotificationTargetResponseDto;
  usageCount: number;
  orphanedRuleCount: number;
  actionsDisabled: boolean;
  onEdit: (target: NotificationTargetResponseDto) => void;
};

export const NotificationTargetCard = ({
  target,
  usageCount,
  orphanedRuleCount,
  actionsDisabled,
  onEdit,
}: NotificationTargetCardProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const deleteTarget = useNotificationsGuildControllerDeleteGuildTarget<
    unknown,
    GuildNotificationCacheSnapshot | undefined
  >({
    mutation: {
      onMutate: async (variables) => {
        if (!guildId) {
          return undefined;
        }

        await cancelGuildNotificationQueries(queryClient, guildId);
        const previousNotifications = getGuildNotificationCacheSnapshot(
          queryClient,
          guildId,
        );

        removeGuildNotificationTargetFromCache(
          queryClient,
          guildId,
          variables.pathParams.targetId,
        );

        return previousNotifications;
      },
      onSuccess: async () => {
        if (!guildId) {
          return;
        }

        await invalidateGuildNotificationQueries(queryClient, guildId);
      },
      onError: (_error, _variables, previousNotifications) => {
        if (!guildId) {
          return;
        }

        restoreGuildNotificationCacheSnapshot(
          queryClient,
          guildId,
          previousNotifications,
        );
      },
    },
  });
  const isActionDisabled = actionsDisabled || deleteTarget.isPending;

  const handleDelete = async () => {
    try {
      if (!guildId) {
        throw new Error("Missing guild id.");
      }

      await deleteTarget.mutateAsync({
        pathParams: { guildId, targetId: target.id },
      });
      toast.success(t("settings.notifications.toasts.targetDeleted"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.targetDeleteError"),
      );
      throw error;
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
                aria-label={t("settings.notifications.actions.edit")}
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
                  description={
                    orphanedRuleCount > 0
                      ? t(
                          "settings.notifications.deleteTargetDialog.descriptionWithOrphanedRules",
                          {
                            name: getGuildNotificationTargetLabel(target),
                            count: orphanedRuleCount,
                          },
                        )
                      : t(
                          "settings.notifications.deleteTargetDialog.description",
                          {
                            name: getGuildNotificationTargetLabel(target),
                          },
                        )
                  }
                  confirmButtonLabel={t(
                    "settings.notifications.actions.delete",
                  )}
                  cancelButtonLabel={t("settings.notifications.actions.cancel")}
                  trigger={
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      aria-label={t("settings.notifications.actions.delete")}
                    >
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
