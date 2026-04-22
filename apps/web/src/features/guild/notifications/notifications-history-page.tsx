import { useState } from "react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import { Badge } from "@lootlog/ui/components/badge";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import {
  getJobKindLabel,
  getJobStatusBadgeProps,
  getJobStatusLabel,
  getNotificationTriggerTranslationKey,
} from "./utils/notification-settings.utils";
import { NotificationJobDetailDialog } from "./components/notification-job-detail-dialog";
import { History } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getNotificationsGuildControllerGetGuildJobsQueryKey,
  useNotificationsGuildControllerGetGuildJobs,
} from "@/lib/api/generated/main/notifications/notifications";
import type { NotificationJobsResponseDto } from "@/lib/api/generated/main/model";

export const NotificationsHistoryPage = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const { data, isLoading } = useNotificationsGuildControllerGetGuildJobs(
    { guildId: guildId ?? "" },
    {
      query: {
        queryKey: getNotificationsGuildControllerGetGuildJobsQueryKey({
          guildId: guildId ?? "",
        }),
      },
    },
  );
  const [selectedJob, setSelectedJob] = useState<
    NotificationJobsResponseDto["history"][number] | null
  >(null);

  const historyJobs = data?.history ?? [];
  const openJobDetails = (
    job: NotificationJobsResponseDto["history"][number],
  ) => {
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
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card
                  key={i}
                  className="border-border bg-card/40 p-3 backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-40" />
                      <div className="flex gap-2">
                        <Skeleton className="h-4 w-16 rounded-full" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
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
