import { useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Spinner } from "@lootlog/ui/components/spinner";
import {
  useGuildNotificationJobs,
  type GuildNotificationJob,
} from "@/hooks/api/guilds/use-guild-notifications";
import {
  getJobStatusBadgeProps,
  getNotificationTriggerTranslationKey,
} from "./utils/notification-settings.utils";
import { NotificationJobDetailDialog } from "./components/notification-job-detail-dialog";
import { History } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";

export const NotificationsHistoryPage = () => {
  const { t } = useTranslation();
  const { data, isLoading } = useGuildNotificationJobs();
  const [selectedJob, setSelectedJob] = useState<GuildNotificationJob | null>(
    null,
  );

  const jobStatusLabels = {
    PENDING: t("settings.notifications.jobStatuses.pending"),
    PROCESSING: t("settings.notifications.jobStatuses.processing"),
    SENT: t("settings.notifications.jobStatuses.sent"),
    FAILED: t("settings.notifications.jobStatuses.failed"),
    BLOCKED: t("settings.notifications.jobStatuses.blocked"),
    CANCELED: t("settings.notifications.jobStatuses.canceled"),
  } as const;
  const jobKindLabels = {
    SCHEDULED: t("settings.notifications.jobKinds.scheduled"),
    INSTANT: t("settings.notifications.jobKinds.instant"),
    TEST: t("settings.notifications.jobKinds.test"),
  } as const;

  const historyJobs = data?.history ?? [];
  const openJobDetails = (job: GuildNotificationJob) => {
    setSelectedJob(job);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-background/50">
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 px-3 py-3">
          <PageHeader
            icon={History}
            title={t("settings.notifications.notificationsHistory.title")}
            description={t(
              "settings.notifications.notificationsHistory.description",
            )}
          />

          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner className="h-8 w-8" />
            </div>
          ) : historyJobs.length > 0 ? (
            <div className="flex flex-col gap-3">
              {historyJobs.map((job) => (
                <Card
                  key={job.id}
                  variant="interactive"
                  role="button"
                  tabIndex={0}
                  className="gap-2 border-border/70 bg-background/30 p-3 text-left backdrop-blur-sm hover:bg-background/50"
                  onClick={() => openJobDetails(job)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openJobDetails(job);
                    }
                  }}
                >
                  <div className="flex flex-col gap-2">
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
                          {
                            jobStatusLabels[
                              job.status as keyof typeof jobStatusLabels
                            ]
                          }
                        </Badge>
                        <Badge variant="secondary">
                          {
                            jobKindLabels[
                              job.jobKind as keyof typeof jobKindLabels
                            ]
                          }
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(job.updatedAt), "dd.MM.yyyy HH:mm:ss")}
                    </p>
                    {job.lastError ? (
                      <p className="text-xs text-destructive">
                        {job.lastError}
                      </p>
                    ) : null}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-background/20 p-6 text-sm text-muted-foreground">
              {t("settings.notifications.empty.historyJobs")}
            </div>
          )}
        </div>
      </ScrollArea>
      <NotificationJobDetailDialog
        job={selectedJob}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJob(null);
          }
        }}
      />
    </div>
  );
};
