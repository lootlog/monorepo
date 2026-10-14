import { ROUTES } from "@/config/routes";
import { useGuildId } from "@/hooks/context/use-guild-id";
import type { NotificationJobsResponseDto } from "@lootlog/client/main";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NotificationHistoryRow } from "./notification-history-row";
import { NotificationJobDetailDialog } from "./notification-job-detail-dialog";
import { NotificationsSection } from "./notifications-section";

const RECENT_HISTORY_PREVIEW_COUNT = 5;

type Job = NotificationJobsResponseDto["history"][number];

type NotificationsRecentHistorySectionProps = {
  historyJobs: Job[];
};

/** The latest deliveries, with a link to the full history. */
export const NotificationsRecentHistorySection = ({
  historyJobs,
}: NotificationsRecentHistorySectionProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const recentJobs = historyJobs.slice(0, RECENT_HISTORY_PREVIEW_COUNT);

  return (
    <NotificationsSection
      id="notifications-history"
      title={t("settings.notifications.jobs.history")}
      trailing={
        recentJobs.length > 0 && (
          <ChevronLink
            className="inline-flex h-8 shrink-0 items-center gap-1 text-xs"
            render=<Link
              to={ROUTES.guild.notifications.history(guildId ?? "")}
            />
          >
            {t("settings.notifications.actions.showAllHistory", {
              count: historyJobs.length,
            })}
          </ChevronLink>
        )
      }
      emptyLabel={
        recentJobs.length === 0
          ? t("settings.notifications.empty.historyJobs")
          : undefined
      }
    >
      {recentJobs.map((job) => (
        <NotificationHistoryRow
          key={job.id}
          job={job}
          openJobDetails={setSelectedJob}
        />
      ))}
      <NotificationJobDetailDialog
        job={selectedJob}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJob(null);
          }
        }}
      />
    </NotificationsSection>
  );
};
