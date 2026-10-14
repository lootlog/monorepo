import { MetaItem } from "@/components/common/meta-item";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  useNotificationsGuildControllerDeleteGuildTarget,
  type NotificationTargetResponseDto,
} from "@lootlog/client/main";
import { getApiErrorMessage } from "@lootlog/client/transport";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "cn";
import { Hash, ListChecks, MessageSquare, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getGuildNotificationMutationCallbacks,
  prepareGuildNotificationMutation,
  removeGuildNotificationTargetFromCache,
  type GuildNotificationCacheSnapshot,
} from "../notifications-api";
import { getGuildNotificationTargetLabel } from "../utils/notification-settings.utils";
import { NotificationDeleteAction } from "./notification-delete-action";

type NotificationTargetTileProps = {
  target: NotificationTargetResponseDto;
  usageCount: number;
  orphanedRuleCount: number;
  actionsDisabled: boolean;
  onEdit: (target: NotificationTargetResponseDto) => void;
};

/**
 * One Discord channel in the channel list; the tile opens its editor. A
 * channel that cannot deliver is tinted and says why.
 */
export const NotificationTargetTile = ({
  target,
  usageCount,
  orphanedRuleCount,
  actionsDisabled,
  onEdit,
}: NotificationTargetTileProps) => {
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

        const previousNotifications = await prepareGuildNotificationMutation(
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
      ...getGuildNotificationMutationCallbacks(queryClient, guildId),
    },
  });

  const isActionDisabled = actionsDisabled || deleteTarget.isPending;
  const label = getGuildNotificationTargetLabel(target);
  const hasProblem = !target.active || !target.canSend;

  const handleDelete = async () => {
    if (!guildId) {
      const error = new Error("Missing guild id.");
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.targetDeleteError"),
      );
      throw error;
    }

    try {
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
    <div data-list-tile className={LIST_TILE_RULE_CLASS}>
      <div
        className={cn(
          "flex items-center transition-colors hover:bg-muted/30 motion-reduce:transition-none",
          hasProblem && "bg-signal-timer/[0.06] hover:bg-signal-timer/10",
        )}
      >
        <button
          type="button"
          disabled={isActionDisabled}
          onClick={() => onEdit(target)}
          aria-label={t("settings.notifications.actions.editTargetNamed", {
            name: label,
          })}
          className={cn(
            getListTileLinkClassName(true),
            "text-left disabled:cursor-not-allowed",
          )}
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
            <Hash aria-hidden className="size-4 text-muted-foreground" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="truncate text-sm font-semibold">{label}</span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              {!target.active && (
                <MetaItem icon={TriangleAlert} className="text-signal-timer">
                  {t("settings.notifications.states.inactive")}
                </MetaItem>
              )}
              {target.active && !target.canSend && (
                <MetaItem icon={TriangleAlert} className="text-signal-timer">
                  {t("settings.notifications.states.cannotSend")}
                </MetaItem>
              )}
              <MetaItem icon={ListChecks}>
                {t("settings.notifications.targetUsageCount", {
                  count: usageCount,
                })}
              </MetaItem>
              <MetaItem icon={MessageSquare} className="min-w-0 max-sm:hidden">
                <span className="min-w-0 truncate">
                  {t(`settings.notifications.targetTypes.${target.targetType}`)}
                  {": "}
                  {target.externalId}
                </span>
              </MetaItem>
            </span>
          </span>
        </button>
        <div className={LIST_TILE_ACTIONS_CLASS}>
          <NotificationDeleteAction
            label={t("settings.notifications.actions.deleteTargetNamed", {
              name: label,
            })}
            disabled={isActionDisabled}
            onConfirm={handleDelete}
            title={t("settings.notifications.deleteTargetDialog.title")}
            description={
              orphanedRuleCount > 0
                ? t(
                    "settings.notifications.deleteTargetDialog.descriptionWithOrphanedRules",
                    { name: label, count: orphanedRuleCount },
                  )
                : t("settings.notifications.deleteTargetDialog.description", {
                    name: label,
                  })
            }
          />
        </div>
      </div>
    </div>
  );
};
