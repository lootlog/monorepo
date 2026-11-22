import { EmptyState } from "@/components/common/empty-state";
import { ListToolbar } from "@/components/common/list-toolbar";
import { PillToggleGroup } from "@/components/common/pill-toggle-group";
import { SettingsListError } from "@/components/common/settings-list-error";
import type { NotificationJobsResponseDto } from "@lootlog/client/main";
import { Button } from "@lootlog/ui/components/button";
import { groupBy } from "es-toolkit";
import { History, SearchX } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { NotificationHistoryRow } from "./notification-history-row";
import { NotificationJobDetailDialog } from "./notification-job-detail-dialog";
import { NotificationTileSkeleton } from "../notification-tile-skeleton";
import {
  getJobStatusLabel,
  getNotificationTriggerTranslationKey,
} from "../utils/notification-settings.utils";
import { normalizeSearchText } from "@lootlog/domain/text-fold";

type Job = NotificationJobsResponseDto["history"][number];

type NotificationHistoryListProps = {
  historyJobs: Job[];
  isLoading: boolean;
  isError: boolean;
  isRetrying: boolean;
  onRetry: () => void;
};

export const NotificationHistoryList = ({
  historyJobs,
  isLoading,
  isError,
  isRetrying,
  onRetry,
}: NotificationHistoryListProps) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const normalizedSearch = normalizeSearchText(search);

  const getJobName = (job: Job) =>
    job.rule.name ??
    t(getNotificationTriggerTranslationKey(job.rule.triggerType));

  const nameMatches = historyJobs.filter((job) =>
    normalizeSearchText(getJobName(job)).includes(normalizedSearch),
  );

  const statusGroups = Object.entries(
    groupBy(nameMatches, (job) => job.status),
  );

  const activeStatuses = selectedStatuses.filter((status) =>
    statusGroups.some(([groupStatus]) => groupStatus === status),
  );

  const activeStatusSet = new Set(activeStatuses);

  const visibleJobs = nameMatches.filter(
    (job) => activeStatusSet.size === 0 || activeStatusSet.has(job.status),
  );

  const clearFilters = () => {
    setSearch("");
    setSelectedStatuses([]);
  };

  const renderContent = () => {
    if (isError) {
      return (
        <SettingsListError
          title={t("settings.notifications.empty.loadError")}
          isRetrying={isRetrying}
          onRetry={onRetry}
        />
      );
    }

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
            fill
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
            fill
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
    <>
      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        placeholder={t("settings.notifications.historyFilterPlaceholder")}
        label={t("settings.notifications.historyFilterLabel")}
        clearLabel={t("settings.notifications.clearFilter")}
        disabled={isLoading}
      >
        {statusGroups.length > 1 && (
          <PillToggleGroup
            multiple
            label={t("settings.notifications.historyStatusesLabel")}
            value={activeStatuses}
            onValueChange={setSelectedStatuses}
            options={statusGroups.map(([status, jobs]) => ({
              value: status,
              label: getJobStatusLabel(status, t),
              count: jobs.length,
            }))}
          />
        )}
      </ListToolbar>
      {renderContent()}
      <NotificationJobDetailDialog
        job={selectedJob}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedJob(null);
          }
        }}
      />
    </>
  );
};
