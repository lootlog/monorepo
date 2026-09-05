import { NotificationHistoryRow } from "./components/notification-history-row";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@lootlog/ui/components/card";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { Skeleton } from "@lootlog/ui/components/skeleton";
import { NotificationJobDetailDialog } from "./components/notification-job-detail-dialog";
import { History } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getNotificationsGuildControllerGetGuildJobsQueryKey,
  useNotificationsGuildControllerGetGuildJobs,
} from "@lootlog/client/main";
import type { NotificationJobsResponseDto } from "@lootlog/client/main";

export const NotificationsHistoryPage = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const hasGuildId = Boolean(guildId);
  const { data, isLoading } = useNotificationsGuildControllerGetGuildJobs(
    { guildId: guildId ?? "" },
    {
      query: {
        enabled: hasGuildId,
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
    <div className="flex h-full min-h-0 flex-col bg-background">
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
                <Card key={i} className="border-border bg-card p-3">
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
                <NotificationHistoryRow
                  key={job.id}
                  job={job}
                  openJobDetails={openJobDetails}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border/80 bg-background p-6 text-sm text-muted-foreground">
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
