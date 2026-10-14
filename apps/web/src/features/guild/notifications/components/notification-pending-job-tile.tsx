import { MetaItem } from "@/components/common/meta-item";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type { NotificationJobsResponseDto } from "@lootlog/client/main";
import { Badge } from "@lootlog/ui/components/badge";
import { ConfirmDeleteDialog } from "@lootlog/ui/components/confirm-delete-dialog";
import { cn } from "cn";
import { Ban, CalendarClock, Hash, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";
import {
  getGuildNotificationTargetLabel,
  getJobErrorMessage,
  getJobKindLabel,
  getJobStatusBadgeProps,
  getJobStatusLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";
import { NotificationJobCountdown } from "./notification-job-countdown";
import { NotificationTileAction } from "./notification-tile-action";

type NotificationPendingJobTileProps = {
  job: NotificationJobsResponseDto["pending"][number];
  cancelDisabled: boolean;
  onCancel: () => Promise<void>;
};

/** A delivery waiting in the queue, counting down to its send time. */
export const NotificationPendingJobTile = ({
  job,
  cancelDisabled,
  onCancel,
}: NotificationPendingJobTileProps) => {
  const { t } = useTranslation();

  const name =
    job.rule.name ??
    t(getNotificationTriggerTranslationKey(job.rule.triggerType));

  return (
    <div data-list-tile className={LIST_TILE_RULE_CLASS}>
      <div
        className={cn(
          "flex items-center gap-3 py-3",
          LIST_TILE_INSET_CLASS,
          job.blockedReason && "bg-signal-timer/[0.06]",
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <span className="min-w-0 truncate text-sm font-semibold">
              {name}
            </span>
            {job.status !== "PENDING" && (
              <Badge
                {...getJobStatusBadgeProps(job.status)}
                className="h-5 shrink-0 px-2 text-[11px]"
              >
                {getJobStatusLabel(job.status, t)}
              </Badge>
            )}
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <MetaItem
              icon={Hash}
              label={t("settings.notifications.sections.targets")}
              className="min-w-0"
            >
              <span className="min-w-0 truncate">
                {getGuildNotificationTargetLabel(job.target)}
              </span>
            </MetaItem>
            <MetaItem
              icon={CalendarClock}
              label={getJobKindLabel(job.jobKind, t)}
              title={getJobKindLabel(job.jobKind, t)}
            >
              {timestampToDate(job.scheduledFor, DATE_TIME_WITH_SECONDS_FORMAT)}
            </MetaItem>
          </div>
          {job.blockedReason && (
            <MetaItem
              icon={TriangleAlert}
              className="whitespace-normal text-signal-timer"
            >
              {getJobErrorMessage(job.blockedReason, t)}
            </MetaItem>
          )}
        </div>
        <NotificationJobCountdown scheduledFor={job.scheduledFor} />
        <ConfirmDeleteDialog
          disabled={cancelDisabled}
          onConfirm={onCancel}
          title={t("settings.notifications.cancelJobDialog.title")}
          description={t("settings.notifications.cancelJobDialog.description", {
            name,
          })}
          confirmButtonLabel={t("settings.notifications.actions.cancelPending")}
          cancelButtonLabel={t("settings.notifications.actions.cancel")}
          trigger={
            <NotificationTileAction
              label={t("settings.notifications.actions.cancelPendingNamed", {
                name,
              })}
              icon={<Ban className="size-4" />}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            />
          }
        />
      </div>
    </div>
  );
};
