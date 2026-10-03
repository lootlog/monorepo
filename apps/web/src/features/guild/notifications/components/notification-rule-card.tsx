import { ROUTES } from "@/config/routes";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { NotificationDeleteAction } from "./notification-delete-action";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@lootlog/ui/components/tooltip";
import { Link } from "@tanstack/react-router";
import { FlaskConical, Pencil, RefreshCw, TriangleAlert } from "lucide-react";

import { getGuildNotificationTargetLabel } from "../utils/notification-settings.utils";

import { useNotificationRuleActions } from "./use-notification-rule-actions";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";

export const NotificationRuleCard = (
  props: Parameters<typeof useNotificationRuleActions>[0],
) => {
  const {
    viewModel,
    rule,
    t,
    targetLabels,
    isActionDisabled,
    hasTestableTargets,
    triggerRuleTest,
    handleTriggerTest,
    rebuildRuleJobs,
    handleRebuildJobs,
    guildId,
    handleDelete,
  } = useNotificationRuleActions(props);

  return (
    <div className="border-b border-border/70 px-3 py-3 last:border-b-0">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {viewModel.displayName}
            </p>
            <p className="text-xs text-muted-foreground">
              {viewModel.triggerLabel}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={rule.enabled ? "default" : "secondary"}>
              {viewModel.enabledLabel}
            </Badge>
            {rule.world ? (
              <Badge variant="secondary">{rule.world}</Badge>
            ) : null}
            {viewModel.recurringScheduleLabel ? (
              <Badge variant="secondary">
                {viewModel.recurringScheduleLabel}
              </Badge>
            ) : null}
            {viewModel.scheduledAtLabel ? (
              <Badge variant="secondary">{viewModel.scheduledAtLabel}</Badge>
            ) : null}
            {viewModel.timerScheduleLabel ? (
              <Badge variant="secondary">{viewModel.timerScheduleLabel}</Badge>
            ) : null}
            <Badge variant="secondary">
              {t("settings.notifications.targetCount", {
                count: targetLabels.length,
              })}
            </Badge>
            {viewModel.npcLabel ? (
              <Badge variant="secondary">{viewModel.npcLabel}</Badge>
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
                  className={`inline-flex items-center gap-0.5 ${!target.active ? "text-signal-timer" : ""}`}
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
                date: timestampToDate(
                  rule.testTrigger.nextAvailableAt,
                  DATE_TIME_WITH_SECONDS_FORMAT,
                ),
              })}
            </p>
          ) : null}
        </div>
        <div className="flex gap-1">
          <Tooltip>
            <TooltipTrigger
              render={
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
                  loading={triggerRuleTest.isPending}
                  onClick={handleTriggerTest}
                >
                  <FlaskConical className="size-4" />
                </Button>
              }
            />
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
            <TooltipTrigger
              render={
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  aria-label={t(
                    "settings.notifications.actions.rebuildPending",
                  )}
                  disabled={isActionDisabled || !rule.enabled}
                  loading={rebuildRuleJobs.isPending}
                  onClick={handleRebuildJobs}
                >
                  <RefreshCw className="size-4" />
                </Button>
              }
            />
            <TooltipContent>
              {t("settings.notifications.actions.rebuildPending")}
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render=<Button
                type="button"
                size="icon"
                variant="outline"
                aria-label={t("settings.notifications.actions.edit")}
                disabled={isActionDisabled}

                render={
                  <Link
                    to={ROUTES.guild.notifications.rule(
                      guildId ?? "",
                      String(rule.id),
                    )}
                  >
                    <Pencil className="size-4" />
                  </Link>
                }
                nativeButton={false}
              />
            />
            <TooltipContent>
              {t("settings.notifications.actions.edit")}
            </TooltipContent>
          </Tooltip>
          <NotificationDeleteAction
            disabled={isActionDisabled}
            onConfirm={handleDelete}
            title={t("settings.notifications.deleteRuleDialog.title")}
            description={t(
              "settings.notifications.deleteRuleDialog.description",
              {
                name: viewModel.displayName,
              },
            )}
          />
        </div>
      </div>
    </div>
  );
};
