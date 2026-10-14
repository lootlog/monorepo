import { MetaItem } from "@/components/common/meta-item";
import {
  LIST_TILE_INSET_CLASS,
  LIST_TILE_RULE_CLASS,
} from "@/components/common/list-tile";
import type { NotificationJobsResponseDto } from "@lootlog/client/main";
import { Badge } from "@lootlog/ui/components/badge";
import { cn } from "cn";
import { Clock3, Send, TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  DATE_TIME_WITH_SECONDS_FORMAT,
  timestampToDate,
} from "@/utils/date/parse-timestamp-to-date";
import {
  getJobErrorMessage,
  getJobKindLabel,
  getJobStatusBadgeProps,
  getJobStatusLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";

type Job = NotificationJobsResponseDto["history"][number];

/** A finished delivery; the tile opens its details. */
export function NotificationHistoryRow({
  job,
  openJobDetails,
}: {
  job: Job;
  openJobDetails: (job: Job) => void;
}) {
  const { t } = useTranslation();

  return (
    <div data-list-tile className={LIST_TILE_RULE_CLASS}>
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-3 py-3 text-left outline-none transition-colors hover:bg-muted/30 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset motion-reduce:transition-none",
          LIST_TILE_INSET_CLASS,
        )}
        onClick={() => openJobDetails(job)}
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="truncate text-sm font-semibold">
            {job.rule.name ??
              t(getNotificationTriggerTranslationKey(job.rule.triggerType))}
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
            <MetaItem icon={Clock3}>
              {timestampToDate(job.updatedAt, DATE_TIME_WITH_SECONDS_FORMAT)}
            </MetaItem>
            <MetaItem icon={Send}>{getJobKindLabel(job.jobKind, t)}</MetaItem>
          </span>
          {job.lastError && (
            <MetaItem icon={TriangleAlert} className="min-w-0 text-destructive">
              <span className="min-w-0 truncate">
                {getJobErrorMessage(job.lastError, t)}
              </span>
            </MetaItem>
          )}
        </span>
        <Badge
          {...getJobStatusBadgeProps(job.status)}
          className="h-5 shrink-0 px-2 text-[11px]"
        >
          {getJobStatusLabel(job.status, t)}
        </Badge>
      </button>
    </div>
  );
}
