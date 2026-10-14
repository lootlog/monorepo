import { MetaItem } from "@/components/common/meta-item";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import { ROUTES } from "@/config/routes";
import { CreateNotificationRuleDtoTriggerType as NotificationTriggerType } from "@lootlog/client/main";
import { Badge } from "@lootlog/ui/components/badge";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import {
  CalendarClock,
  Clock3,
  FlaskConical,
  Globe,
  Hash,
  RefreshCw,
  Swords,
  Timer,
  TriangleAlert,
} from "lucide-react";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";
import { NotificationDeleteAction } from "./notification-delete-action";
import { NotificationTileAction } from "./notification-tile-action";
import { useNotificationRuleActions } from "./use-notification-rule-actions";

/** One rule in the rule list; the tile opens the rule's editor. */
export const NotificationRuleTile = (
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

  const TriggerIcon =
    rule.triggerType === NotificationTriggerType.SCHEDULED_MESSAGE
      ? CalendarClock
      : Timer;

  const scheduleLabel =
    viewModel.recurringScheduleLabel ??
    viewModel.scheduledAtLabel ??
    viewModel.timerScheduleLabel;

  const hasInactiveTarget = rule.targets.some(({ target }) => !target.active);

  return (
    <div data-list-tile className={LIST_TILE_RULE_CLASS}>
      <div className="flex items-center transition-colors hover:bg-muted/30 motion-reduce:transition-none">
        <Link
          to={ROUTES.guild.notifications.rule(guildId ?? "", String(rule.id))}
          className={getListTileLinkClassName(true)}
        >
          <span
            title={viewModel.triggerLabel}
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted",
              !rule.enabled && "opacity-60",
            )}
          >
            <TriggerIcon aria-hidden className="size-4 text-muted-foreground" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "min-w-0 truncate text-sm font-semibold",
                  !rule.enabled && "text-muted-foreground",
                )}
              >
                {viewModel.displayName}
              </span>
              <span className="sr-only">{viewModel.triggerLabel}</span>
              {!rule.enabled && (
                <Badge
                  variant="outline"
                  className="h-5 shrink-0 px-2 text-[11px]"
                >
                  {viewModel.enabledLabel}
                </Badge>
              )}
            </span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              {scheduleLabel && (
                <MetaItem icon={Clock3} className="min-w-0">
                  <span className="min-w-0 truncate">{scheduleLabel}</span>
                </MetaItem>
              )}
              {rule.world && <MetaItem icon={Globe}>{rule.world}</MetaItem>}
              {viewModel.npcLabel && (
                <MetaItem icon={Swords}>{viewModel.npcLabel}</MetaItem>
              )}
              {rule.targets.length > 0 && (
                <MetaItem
                  icon={hasInactiveTarget ? TriangleAlert : Hash}
                  label={t("settings.notifications.sections.targets")}
                  className={cn(
                    "min-w-0",
                    hasInactiveTarget && "text-signal-timer",
                  )}
                  title={
                    hasInactiveTarget
                      ? t("settings.notifications.inactiveTargetsWarning")
                      : undefined
                  }
                >
                  <span className="min-w-0 truncate">
                    {targetLabels.join(", ")}
                  </span>
                </MetaItem>
              )}
            </span>
            {rule.testTrigger.nextAvailableAt && (
              <span className="text-xs text-muted-foreground">
                {t("settings.notifications.testTriggerNextAvailable", {
                  date: timestampToDate(
                    rule.testTrigger.nextAvailableAt,
                    DATE_TIME_WITH_SECONDS_FORMAT,
                  ),
                })}
              </span>
            )}
          </span>
        </Link>
        <div className={LIST_TILE_ACTIONS_CLASS}>
          <NotificationTileAction
            label={t("settings.notifications.actions.testNow")}
            hint={t("settings.notifications.testTriggerUsage", {
              used: rule.testTrigger.used,
              limit: rule.testTrigger.limit,
              minutes: Math.floor(rule.testTrigger.windowSeconds / 60),
            })}
            icon={<FlaskConical className="size-4" />}
            disabled={
              isActionDisabled ||
              !rule.enabled ||
              !hasTestableTargets ||
              rule.testTrigger.remaining === 0
            }
            loading={triggerRuleTest.isPending}
            onClick={handleTriggerTest}
          />
          <NotificationTileAction
            label={t("settings.notifications.actions.rebuildPending")}
            icon={<RefreshCw className="size-4" />}
            disabled={isActionDisabled || !rule.enabled}
            loading={rebuildRuleJobs.isPending}
            onClick={handleRebuildJobs}
          />
          <NotificationDeleteAction
            label={t("settings.notifications.actions.deleteRuleNamed", {
              name: viewModel.displayName,
            })}
            disabled={isActionDisabled}
            onConfirm={handleDelete}
            title={t("settings.notifications.deleteRuleDialog.title")}
            description={t(
              "settings.notifications.deleteRuleDialog.description",
              { name: viewModel.displayName },
            )}
          />
        </div>
      </div>
    </div>
  );
};
