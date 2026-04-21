import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { format } from "date-fns";
import {
  FlaskConical,
  Pencil,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { getApiErrorMessage } from "@/features/guild/events/utils/get-api-error-message";
import { ROUTES } from "@/config/routes";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  CreateNotificationRuleDtoScheduleIntervalType as NotificationScheduleIntervalType,
  CreateNotificationRuleDtoTriggerType as NotificationTriggerType,
} from "@/lib/api/generated/main/model";
import {
  getGuildNotificationRuleNpcCount,
  getGuildNotificationRuleScheduleTranslationKey,
  getGuildNotificationTargetLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";
import { formatNotificationDateInTimeZone } from "../utils/notification-schedule-time.utils";
import { invalidateGuildNotificationQueries } from "../notifications-api";
import {
  useNotificationsGuildControllerDeleteGuildRule,
  useNotificationsGuildControllerRebuildGuildRuleJobs,
  useNotificationsGuildControllerTriggerGuildRuleTest,
} from "@/lib/api/generated/main/notifications/notifications";
import type { GuildNotificationRulesResponseDto } from "@/lib/api/generated/main/model";

type NotificationRuleCardProps = {
  rule: GuildNotificationRulesResponseDto["items"][number];
  actionsDisabled: boolean;
};

export const NotificationRuleCard = ({
  rule,
  actionsDisabled,
}: NotificationRuleCardProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const deleteRule = useNotificationsGuildControllerDeleteGuildRule({
    mutation: {
      onSuccess: async () => {
        if (!guildId) {
          return;
        }

        await invalidateGuildNotificationQueries(queryClient, guildId);
      },
    },
  });
  const rebuildRuleJobs = useNotificationsGuildControllerRebuildGuildRuleJobs({
    mutation: {
      onSuccess: async () => {
        if (!guildId) {
          return;
        }

        await invalidateGuildNotificationQueries(queryClient, guildId);
      },
    },
  });
  const triggerRuleTest = useNotificationsGuildControllerTriggerGuildRuleTest({
    mutation: {
      onSuccess: async () => {
        if (!guildId) {
          return;
        }

        await invalidateGuildNotificationQueries(queryClient, guildId);
      },
    },
  });
  const targetLabels = rule.targets.map(({ target }) => {
    const label = getGuildNotificationTargetLabel(target);
    if (!target.active) {
      return `${label} ${t("settings.notifications.targetInactive")}`;
    }
    return label;
  });
  const npcCount = getGuildNotificationRuleNpcCount(rule);
  const hasTestableTargets = rule.targets.some(
    ({ target }) => target.active && target.canSend,
  );
  const isActionDisabled =
    actionsDisabled ||
    deleteRule.isPending ||
    rebuildRuleJobs.isPending ||
    triggerRuleTest.isPending;

  const handleRebuildJobs = async () => {
    try {
      if (!guildId) {
        throw new Error("Missing guild id.");
      }

      await rebuildRuleJobs.mutateAsync({
        pathParams: { guildId, ruleId: rule.id },
      });
      toast.success(t("settings.notifications.toasts.ruleJobsRebuilt"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.ruleJobsRebuildError"),
      );
    }
  };

  const handleTriggerTest = async () => {
    try {
      if (!guildId) {
        throw new Error("Missing guild id.");
      }

      await triggerRuleTest.mutateAsync({
        pathParams: { guildId, ruleId: rule.id },
      });
      toast.success(t("settings.notifications.toasts.ruleTestTriggered"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.ruleTestTriggerError"),
      );
    }
  };

  const handleDelete = async () => {
    try {
      if (!guildId) {
        throw new Error("Missing guild id.");
      }

      await deleteRule.mutateAsync({
        pathParams: { guildId, ruleId: rule.id },
      });
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
            <Badge variant={rule.enabled ? "default" : "secondary"}>
              {rule.enabled
                ? t("settings.notifications.states.enabled")
                : t("settings.notifications.states.disabled")}
            </Badge>
            {rule.world ? (
              <Badge variant="secondary">{rule.world}</Badge>
            ) : null}
            {rule.triggerType === NotificationTriggerType.SCHEDULED_MESSAGE &&
            rule.scheduleIntervalType &&
            rule.scheduleIntervalType !==
              NotificationScheduleIntervalType.ONCE ? (
              <Badge variant="secondary">
                {rule.scheduleIntervalType ===
                NotificationScheduleIntervalType.HOURLY
                  ? `${t("settings.notifications.intervalTypes.hourly").replace("X", String(rule.scheduleIntervalValue ?? 1))}`
                  : rule.scheduleIntervalType ===
                      NotificationScheduleIntervalType.DAILY
                    ? `${t("settings.notifications.intervalTypes.daily")} ${rule.scheduleTimeOfDay ?? ""}`
                    : rule.scheduleIntervalType ===
                        NotificationScheduleIntervalType.WEEKLY
                      ? `${t(`settings.notifications.weekdays.${rule.scheduleWeekday ?? 0}`)} ${rule.scheduleTimeOfDay ?? ""}`
                      : ""}
              </Badge>
            ) : null}
            {rule.triggerType === NotificationTriggerType.SCHEDULED_MESSAGE &&
            rule.scheduledAt ? (
              <Badge variant="secondary">
                {formatNotificationDateInTimeZone(
                  rule.scheduledAt,
                  rule.scheduleTimezone ?? "Europe/Warsaw",
                )}
              </Badge>
            ) : null}
            {rule.scheduleAnchor !== null &&
            rule.scheduleOffsetMinutes !== null ? (
              <Badge variant="secondary">
                {t(getGuildNotificationRuleScheduleTranslationKey(rule), {
                  minutes: rule.scheduleOffsetMinutes,
                })}
              </Badge>
            ) : null}
            <Badge variant="secondary">
              {t("settings.notifications.targetCount", {
                count: targetLabels.length,
              })}
            </Badge>
            {rule.triggerType !== NotificationTriggerType.SCHEDULED_MESSAGE ? (
              <Badge variant="secondary">
                {npcCount > 0
                  ? t("settings.notifications.npcCount", { count: npcCount })
                  : t("settings.notifications.allNpcs")}
              </Badge>
            ) : null}
          </div>
          {rule.targets.length > 0 ? (
            <p className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span>
                {t("settings.notifications.targetLabels", {
                  targets: "",
                }).trim()}
              </span>
              {rule.targets.map(({ target }, index) => (
                <span
                  key={target.id}
                  className={`inline-flex items-center gap-0.5 ${!target.active ? "text-amber-500" : ""}`}
                >
                  {!target.active ? (
                    <TriangleAlert className="size-3 shrink-0" />
                  ) : null}
                  {getGuildNotificationTargetLabel(target)}
                  {!target.active
                    ? ` ${t("settings.notifications.targetInactive")}`
                    : ""}
                  {index < rule.targets.length - 1 ? "," : ""}
                </span>
              ))}
            </p>
          ) : null}
          {rule.testTrigger.nextAvailableAt ? (
            <p className="text-xs text-muted-foreground">
              {t("settings.notifications.testTriggerNextAvailable", {
                date: format(
                  new Date(rule.testTrigger.nextAvailableAt),
                  "dd.MM.yyyy HH:mm:ss",
                ),
              })}
            </p>
          ) : null}
        </div>
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="secondary"
                aria-label={t("settings.notifications.actions.testNow")}
                disabled={
                  isActionDisabled ||
                  !rule.enabled ||
                  !hasTestableTargets ||
                  rule.testTrigger.remaining === 0
                }
                onClick={handleTriggerTest}
              >
                <FlaskConical className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t("settings.notifications.actions.testNow")}</p>
              <p className="text-muted-foreground">
                {t("settings.notifications.testTriggerUsage", {
                  used: rule.testTrigger.used,
                  limit: rule.testTrigger.limit,
                  minutes: Math.floor(rule.testTrigger.windowSeconds / 60),
                })}
              </p>
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={t("settings.notifications.actions.rebuildPending")}
                disabled={isActionDisabled || !rule.enabled}
                onClick={handleRebuildJobs}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {t("settings.notifications.actions.rebuildPending")}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={t("settings.notifications.actions.edit")}
                disabled={isActionDisabled}
                asChild
              >
                <Link
                  to={ROUTES.guild.notifications.rule(
                    guildId ?? "",
                    String(rule.id),
                  )}
                >
                  <Pencil className="h-4 w-4" />
                </Link>
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
                  title={t("settings.notifications.deleteRuleDialog.title")}
                  description={t(
                    "settings.notifications.deleteRuleDialog.description",
                    {
                      name:
                        rule.name ??
                        t(
                          getNotificationTriggerTranslationKey(
                            rule.triggerType,
                          ),
                        ),
                    },
                  )}
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
