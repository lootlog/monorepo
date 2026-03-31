import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  useDeleteGuildNotificationRule,
  type GuildNotificationRule,
} from "@/hooks/api/guilds/use-guild-notifications";
import { getApiErrorMessage } from "@/features/events/utils/get-api-error-message";
import {
  getGuildNotificationRuleNpcCount,
  getGuildNotificationTargetLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";

type NotificationRuleCardProps = {
  rule: GuildNotificationRule;
  actionsDisabled: boolean;
  onEdit: (rule: GuildNotificationRule) => void;
};

export const NotificationRuleCard = ({
  rule,
  actionsDisabled,
  onEdit,
}: NotificationRuleCardProps) => {
  const { t } = useTranslation();
  const deleteRule = useDeleteGuildNotificationRule();
  const targetLabels = rule.targets.map(({ target }) =>
    getGuildNotificationTargetLabel(target),
  );
  const npcCount = getGuildNotificationRuleNpcCount(rule);
  const isActionDisabled = actionsDisabled || deleteRule.isPending;

  const handleDelete = async () => {
    try {
      await deleteRule.mutateAsync({ ruleId: rule.id });
      toast.success(t("settings.notifications.toasts.ruleDeleted"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.ruleDeleteError"),
      );
    }
  };

  return (
    <div className="rounded-xl border border-border/70 bg-background/30 p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {rule.name ??
                t(getNotificationTriggerTranslationKey(rule.triggerType))}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(getNotificationTriggerTranslationKey(rule.triggerType))}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={rule.enabled ? "default" : "outline"}>
              {rule.enabled
                ? t("settings.notifications.states.enabled")
                : t("settings.notifications.states.disabled")}
            </Badge>
            {rule.world ? <Badge variant="outline">{rule.world}</Badge> : null}
            {rule.leadTimeMinutes !== null ? (
              <Badge variant="outline">
                {t("settings.notifications.leadTime", {
                  minutes: rule.leadTimeMinutes,
                })}
              </Badge>
            ) : null}
            <Badge variant="outline">
              {t("settings.notifications.targetCount", {
                count: targetLabels.length,
              })}
            </Badge>
            <Badge variant="outline">
              {npcCount > 0
                ? t("settings.notifications.npcCount", { count: npcCount })
                : t("settings.notifications.allNpcs")}
            </Badge>
          </div>
          {targetLabels.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              {t("settings.notifications.targetLabels", {
                targets: targetLabels.join(", "),
              })}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isActionDisabled}
            onClick={() => onEdit(rule)}
          >
            {t("settings.notifications.actions.edit")}
          </Button>
          <ConfirmDeleteDialog
            disabled={isActionDisabled}
            onConfirm={handleDelete}
            title={t("settings.notifications.deleteRuleDialog.title")}
            description={t(
              "settings.notifications.deleteRuleDialog.description",
              {
                name:
                  rule.name ??
                  t(getNotificationTriggerTranslationKey(rule.triggerType)),
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
