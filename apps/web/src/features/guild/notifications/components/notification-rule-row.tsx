import { ROUTES } from "@/config/routes";
import {
  getListTileLinkClassName,
  LIST_TILE_ACTIONS_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type {
  GuildNotificationRulesResponseDto,
  NotificationJobsResponseDto,
} from "@lootlog/client/main";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@lootlog/ui/components/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { cn } from "cn";
import {
  Ban,
  FlaskConical,
  Hash,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useState } from "react";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";
import { getJobErrorMessage } from "../utils/notification-settings.utils";
import { NotificationConfirmDialog } from "./notification-confirm-dialog";
import { NotificationJobCountdown } from "./notification-job-countdown";
import { NotificationLastDelivery } from "./notification-last-delivery";
import { useNotificationRuleActions } from "./use-notification-rule-actions";

type NotificationRuleRowProps = {
  rule: GuildNotificationRulesResponseDto["items"][number];
  actionsDisabled: boolean;
  nextJob: NotificationJobsResponseDto["pending"][number] | undefined;
  lastJob: NotificationJobsResponseDto["history"][number] | undefined;
  onCancelJob: (jobId: string) => Promise<void>;
};

/**
 * One rule, read as a sentence: what it sends and when, where to, how its
 * last delivery went and when the next one goes out. The row opens the
 * rule's editor; everything else sits in a labelled menu.
 */
export const NotificationRuleRow = ({
  rule,
  actionsDisabled,
  nextJob,
  lastJob,
  onCancelJob,
}: NotificationRuleRowProps) => {
  const {
    viewModel,
    t,
    targetLabels,
    isActionDisabled,
    hasTestableTargets,
    handleTriggerTest,
    handleRebuildJobs,
    guildId,
    handleDelete,
  } = useNotificationRuleActions({ rule, actionsDisabled });

  const [confirm, setConfirm] = useState<"delete" | "cancelJob" | null>(null);
  const hasInactiveTarget = rule.targets.some(({ target }) => !target.active);

  const editLink = ROUTES.guild.notifications.rule(
    guildId ?? "",
    String(rule.id),
  );

  return (
    <div data-list-tile className={LIST_TILE_RULE_CLASS}>
      <div className="flex items-center transition-colors hover:bg-muted/30 motion-reduce:transition-none">
        <Link to={editLink} className={getListTileLinkClassName(true)}>
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
              {!rule.enabled && (
                <Badge
                  variant="outline"
                  className="h-5 shrink-0 px-2 text-[11px]"
                >
                  {viewModel.enabledLabel}
                </Badge>
              )}
            </span>
            <span className="text-[13px] leading-5 text-text-supporting">
              {viewModel.summary.join(" · ")}
            </span>
            <span className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1">
              <span
                title={
                  hasInactiveTarget
                    ? t("settings.notifications.inactiveTargetsWarning")
                    : undefined
                }
                className={cn(
                  "flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground",
                  hasInactiveTarget && "text-signal-timer",
                )}
              >
                {hasInactiveTarget ? (
                  <TriangleAlert aria-hidden className="size-3.5 shrink-0" />
                ) : (
                  <Hash aria-hidden className="size-3.5 shrink-0" />
                )}
                <span className="sr-only">
                  {t("settings.notifications.sections.targets")}:{" "}
                </span>
                <span className="min-w-0 truncate">
                  {targetLabels.join(", ")}
                </span>
              </span>
              {lastJob && <NotificationLastDelivery job={lastJob} />}
            </span>
          </span>
          {/* Only a queued delivery has a time; the summary already says when the rest send. */}
          {nextJob && (
            <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
              <span className="text-[11px] text-muted-foreground">
                {t("settings.notifications.rows.nextDelivery")}
              </span>
              <NotificationJobCountdown scheduledFor={nextJob.scheduledFor} />
              {nextJob.blockedReason && (
                <span className="text-[11px] text-signal-timer">
                  {getJobErrorMessage(nextJob.blockedReason, t)}
                </span>
              )}
            </span>
          )}
        </Link>
        <div className={LIST_TILE_ACTIONS_CLASS}>
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  aria-label={t("settings.notifications.actions.moreNamed", {
                    name: viewModel.displayName,
                  })}
                >
                  <MoreHorizontal className="size-4" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuItem render={<Link to={editLink} />}>
                <Pencil />
                {t("settings.notifications.actions.editRule")}
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={
                  isActionDisabled ||
                  !rule.enabled ||
                  !hasTestableTargets ||
                  rule.testTrigger.remaining === 0
                }
                onClick={() => void handleTriggerTest()}
              >
                <FlaskConical />
                <span className="flex flex-1 flex-col">
                  {t("settings.notifications.actions.sendTest")}
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
                <span className="text-xs text-muted-foreground tabular-nums">
                  {rule.testTrigger.used}/{rule.testTrigger.limit}
                </span>
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isActionDisabled || !rule.enabled}
                onClick={() => void handleRebuildJobs()}
              >
                <RefreshCw />
                {t("settings.notifications.actions.rescheduleJobs")}
              </DropdownMenuItem>
              {nextJob && (
                <DropdownMenuItem
                  disabled={isActionDisabled}
                  onClick={() => setConfirm("cancelJob")}
                >
                  <Ban />
                  {t("settings.notifications.actions.cancelNextJob")}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                disabled={isActionDisabled}
                onClick={() => setConfirm("delete")}
              >
                <Trash2 />
                {t("settings.notifications.actions.deleteRule")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <NotificationConfirmDialog
        open={confirm === "delete"}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={t("settings.notifications.deleteRuleDialog.title")}
        description={t("settings.notifications.deleteRuleDialog.description", {
          name: viewModel.displayName,
        })}
        confirmLabel={t("settings.notifications.actions.delete")}
        onConfirm={handleDelete}
      />
      {nextJob && (
        <NotificationConfirmDialog
          open={confirm === "cancelJob"}
          onOpenChange={(open) => !open && setConfirm(null)}
          title={t("settings.notifications.cancelJobDialog.title")}
          description={t("settings.notifications.cancelJobDialog.description", {
            name: viewModel.displayName,
          })}
          confirmLabel={t("settings.notifications.actions.cancelPending")}
          onConfirm={() => onCancelJob(nextJob.id)}
        />
      )}
    </div>
  );
};
