import { NotificationHistoryRowsSkeleton } from "./notification-history-rows-skeleton";
import { NotificationHistoryRow } from "./components/notification-history-row";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import { NotificationJobDetailDialog } from "./components/notification-job-detail-dialog";
import { History } from "lucide-react";
import { PageHeader } from "@/components/common/page-header";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getNotificationsGuildControllerGetGuildJobsQueryKey,
  useNotificationsGuildControllerGetGuildJobs,
  type NotificationJobsResponseDto,
} from "@lootlog/client/main";

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
    <div className="flex h-full min-h-0 flex-col">
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
            <NotificationHistoryRowsSkeleton />
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
            <div className="py-6 text-sm text-muted-foreground">
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
