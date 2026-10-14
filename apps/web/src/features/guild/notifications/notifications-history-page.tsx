import { EmptyState } from "@/components/common/empty-state";
import { FILTER_PILL_CLASS } from "@/components/common/filter-pill";
import { ListToolbar } from "@/components/common/list-toolbar";
import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  getNotificationsGuildControllerGetGuildJobsQueryKey,
  useNotificationsGuildControllerGetGuildJobs,
  type NotificationJobsResponseDto,
} from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { ScrollArea } from "@lootlog/ui/components/scroll-area";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@lootlog/ui/components/toggle-group";
import { groupBy } from "es-toolkit";
import { History, SearchX } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NotificationHistoryRow } from "./components/notification-history-row";
import { NotificationJobDetailDialog } from "./components/notification-job-detail-dialog";
import { NotificationTileSkeleton } from "./notification-tile-skeleton";
import {
  getJobStatusLabel,
  getNotificationTriggerTranslationKey,
} from "./utils/notification-settings.utils";

type Job = NotificationJobsResponseDto["history"][number];

export const NotificationsHistoryPage = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const hasGuildId = Boolean(guildId);
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

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

  const historyJobs = data?.history ?? [];
  const normalizedSearch = search.trim().toLocaleLowerCase("pl");

  const getJobName = (job: Job) =>
    job.rule.name ??
    t(getNotificationTriggerTranslationKey(job.rule.triggerType));

  const nameMatches = historyJobs.filter((job) =>
    getJobName(job).toLocaleLowerCase("pl").includes(normalizedSearch),
  );

  const statusGroups = Object.entries(
    groupBy(nameMatches, (job) => job.status),
  );

  const visibleJobs = nameMatches.filter(
    (job) =>
      selectedStatuses.length === 0 || selectedStatuses.includes(job.status),
  );

  const clearFilters = () => {
    setSearch("");
    setSelectedStatuses([]);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div aria-hidden="true">
          {Array.from({ length: 8 }, (_, index) => (
            <NotificationTileSkeleton key={index} />
          ))}
        </div>
      );
    }

    if (historyJobs.length === 0) {
      return (
        <div className="p-3">
          <EmptyState
            framed
            icon={History}
            title={t("settings.notifications.empty.historyJobs")}
          />
        </div>
      );
    }

    if (visibleJobs.length === 0) {
      return (
        <div className="p-3">
          <EmptyState
            framed
            icon={SearchX}
            title={t("settings.notifications.empty.filteredHistory")}
            action={
              <Button type="button" variant="outline" onClick={clearFilters}>
                {t("settings.notifications.clearFilter")}
              </Button>
            }
          />
        </div>
      );
    }

    return visibleJobs.map((job) => (
      <NotificationHistoryRow
        key={job.id}
        job={job}
        openJobDetails={setSelectedJob}
      />
    ));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <h1 className="sr-only">
        {t("settings.notifications.notificationsHistory.title")}
      </h1>
      <ScrollArea data-under-top-bar className="min-h-0 flex-1">
        <ListToolbar
          search={search}
          onSearchChange={setSearch}
          placeholder={t("settings.notifications.historyFilterPlaceholder")}
          label={t("settings.notifications.historyFilterLabel")}
          clearLabel={t("settings.notifications.clearFilter")}
          disabled={isLoading}
        >
          {statusGroups.length > 1 && (
            <ToggleGroup
              multiple
              variant="outline"
              size="sm"
              spacing={1.5}
              value={selectedStatuses}
              onValueChange={setSelectedStatuses}
              aria-label={t("settings.notifications.historyStatusesLabel")}
              className="flex-wrap"
            >
              {statusGroups.map(([status, jobs]) => (
                <ToggleGroupItem
                  key={status}
                  value={status}
                  className={FILTER_PILL_CLASS}
                >
                  {getJobStatusLabel(status, t)}
                  <span className="text-muted-foreground tabular-nums">
                    {jobs.length}
                  </span>
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          )}
        </ListToolbar>
        {renderContent()}
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
