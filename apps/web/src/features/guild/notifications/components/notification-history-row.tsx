import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";

import { cn } from "cn";
import type { NotificationJobsResponseDto } from "@lootlog/client/main";
import {
  getJobKindLabel,
  getJobStatusBadgeProps,
  getJobStatusLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";

type Job = NotificationJobsResponseDto["history"][number];
export function NotificationHistoryRow({
  job,
  openJobDetails,
  compact = false,
}: {
  job: Job;
  openJobDetails: (job: Job) => void;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      role="button"
      tabIndex={0}
      className={cn(
        "border-b border-border/70 py-3 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors hover:bg-muted/30 last:border-b-0",
        compact ? "gap-1" : "gap-2",
      )}
      onClick={() => openJobDetails(job)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openJobDetails(job);
        }
      }}
    >
      <div className={cn("flex flex-col", compact ? "gap-1" : "gap-2")}>
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-sm font-medium">
            {job.rule.name ??
              t(getNotificationTriggerTranslationKey(job.rule.triggerType))}
          </p>
          <div className="flex shrink-0 gap-1.5">
            <Badge {...getJobStatusBadgeProps(job.status)}>
              {getJobStatusLabel(job.status, t)}
            </Badge>
            <Badge variant="secondary">{getJobKindLabel(job.jobKind, t)}</Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {format(new Date(job.updatedAt), "dd.MM.yyyy HH:mm:ss")}
        </p>
        {job.lastError ? (
          <p className="text-xs text-destructive">{job.lastError}</p>
        ) : null}
      </div>
    </div>
  );
}
