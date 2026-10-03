import { SectionCard } from "@/components/common/section-card/section-card";
import { SectionCardHeader } from "@lootlog/ui/components/section-card-header";
import { SectionCardContent } from "@/components/common/section-card/section-card-content";
import { NotificationHistoryRow } from "./notification-history-row";
import { useState } from "react";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { ChevronLink } from "@lootlog/ui/components/chevron-link";
import { EmptyState } from "@/components/common/empty-state";

import type { NotificationJobsResponseDto } from "@lootlog/client/main";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { ROUTES } from "@/config/routes";
import { NotificationJobDetailDialog } from "./notification-job-detail-dialog";

const RECENT_HISTORY_PREVIEW_COUNT = 5;

type NotificationsRecentHistoryCardProps = {
  historyJobs: NotificationJobsResponseDto["history"];
};

export const NotificationsRecentHistoryCard = ({
  historyJobs,
}: NotificationsRecentHistoryCardProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();

  const [selectedJob, setSelectedJob] = useState<
    NotificationJobsResponseDto["history"][number] | null
  >(null);

  const recentJobs = historyJobs.slice(0, RECENT_HISTORY_PREVIEW_COUNT);

  const openJobDetails = (
    job: NotificationJobsResponseDto["history"][number],
  ) => {
    setSelectedJob(job);
  };

  return (
    <SectionCard>
      <SectionCardHeader
        title={t("settings.notifications.jobs.history")}
        icon={History}
        description={t("settings.notifications.sections.historyDescription")}
        actions={
          recentJobs.length > 0 && (
            <ChevronLink
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
      />
      <SectionCardContent className="flex flex-col gap-3">
        {recentJobs.length > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border/70">
            {recentJobs.map((job) => (
              <NotificationHistoryRow
                key={job.id}
                job={job}
                openJobDetails={openJobDetails}
                compact
              />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={History}
            title={t("settings.notifications.empty.historyJobs")}
            compact
          />
        )}
        <NotificationJobDetailDialog
          job={selectedJob}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedJob(null);
            }
          }}
        />
      </SectionCardContent>
    </SectionCard>
  );
};
