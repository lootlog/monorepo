import { useState } from "react";
import { History } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Badge } from "@lootlog/ui/components/badge";
import { Button } from "@lootlog/ui/components/button";
import { Card } from "@lootlog/ui/components/card";
import type { NotificationJobsResponseDto } from "@lootlog/api-client/models/main/notification-jobs-response-dto";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { ROUTES } from "@/config/routes";
import {
  getJobKindLabel,
  getJobStatusBadgeProps,
  getJobStatusLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";
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
    <Card className="gap-3 border-border bg-card/40 p-4 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-primary/10 p-2.5 shadow-inner shadow-primary/10">
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
            <Card
              key={job.id}
              variant="interactive"
              role="button"
              tabIndex={0}
              className="gap-1 border-border/70 bg-background/30 p-3 text-left backdrop-blur-sm hover:bg-background/50"
              onClick={() => openJobDetails(job)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openJobDetails(job);
                }
              }}
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-medium">
                    {job.rule.name ??
                      t(
                        getNotificationTriggerTranslationKey(
                          job.rule.triggerType,
                        ),
                      )}
                  </p>
                  <div className="flex shrink-0 gap-1.5">
                    <Badge {...getJobStatusBadgeProps(job.status)}>
                      {getJobStatusLabel(job.status, t)}
                    </Badge>
                    <Badge variant="secondary">
                      {getJobKindLabel(job.jobKind, t)}
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(job.updatedAt), "dd.MM.yyyy HH:mm:ss")}
                </p>
                {job.lastError ? (
                  <p className="text-xs text-destructive">{job.lastError}</p>
                ) : null}
              </div>
            </Card>
          ))}
          <Button size="sm" variant="outline" className="w-full" asChild>
            <Link to={ROUTES.guild.notifications.history(guildId ?? "")}>
              {t("settings.notifications.actions.showAllHistory", {
                count: historyJobs.length,
              })}
            </Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border/80 bg-background/20 p-6 text-sm text-muted-foreground">
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
