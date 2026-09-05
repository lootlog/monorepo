import { NotificationHistoryRow } from "./notification-history-row";
import { useState } from "react";
import { History } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
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
    <Card className="gap-3 border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5">
          <History className="size-4 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-semibold">
            {t("settings.notifications.jobs.history")}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t("settings.notifications.sections.historyDescription")}
          </p>
        </div>
      </div>
      {recentJobs.length > 0 ? (
        <div className="flex flex-col gap-3">
          {recentJobs.map((job) => (
            <NotificationHistoryRow
              key={job.id}
              job={job}
              openJobDetails={openJobDetails}
              compact
            />
          ))}
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            render={
              <Link to={ROUTES.guild.notifications.history(guildId ?? "")}>
                {t("settings.notifications.actions.showAllHistory", {
                  count: historyJobs.length,
                })}
              </Link>
            }
            nativeButton={false}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 bg-background p-6 text-sm text-muted-foreground">
          {t("settings.notifications.empty.historyJobs")}
        </div>
      )}
      <NotificationJobDetailDialog
        job={selectedJob}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJob(null);
          }
        }}
      />
    </Card>
  );
};
