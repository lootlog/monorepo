import { getRelativeTime } from "@/utils/date/get-relative-time";
import type { NotificationJobsResponseDto } from "@lootlog/client/main";
import { cn } from "cn";
import { Ban, CircleAlert, CircleCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getJobStatusLabel } from "../utils/notification-settings.utils";

type HistoryJob = NotificationJobsResponseDto["history"][number];

const STATUS_PRESENTATION = {
  SENT: { icon: CircleCheck, className: "text-signal-ready" },
  CANCELED: { icon: Ban, className: "text-muted-foreground" },
} as const;

const FAILED_PRESENTATION = {
  icon: CircleAlert,
  className: "text-destructive",
} as const;

/** How the rule's latest delivery ended, and when. */
export const NotificationLastDelivery = ({ job }: { job: HistoryJob }) => {
  const { t } = useTranslation();

  const { icon: Icon, className } =
    job.status === "SENT" || job.status === "CANCELED"
      ? STATUS_PRESENTATION[job.status]
      : FAILED_PRESENTATION;

  return (
    <span
      className={cn(
        "flex items-center gap-1.5 text-xs whitespace-nowrap",
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span>
        {t("settings.notifications.rows.lastDelivery", {
          status: getJobStatusLabel(job.status, t),
          time: getRelativeTime(job.updatedAt),
        })}
      </span>
    </span>
  );
};
