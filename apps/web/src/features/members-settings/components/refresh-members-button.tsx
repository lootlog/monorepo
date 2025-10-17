import { Button } from "@lootlog/ui/components/button";
import { RefreshCw, Clock } from "lucide-react";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { useMemo, useCallback } from "react";
import { cn } from "@/utils/cn";
import { useRefreshStatus } from "@/features/members-settings/contexts/refresh-status-context";
import { useCountdown } from "@/hooks/utils/use-countdown";
import { useBulkMemberRefresh } from "@/hooks/api/members/use-bulk-member-refresh";
import { useRefreshJob } from "@/hooks/utils/use-refresh-job";

const ADMIN_BULK_REFRESH_RATE_LIMIT = 1000 * 60 * 10; // 10 minutes

export const RefreshMembersButton = () => {
  const guildId = useGuildId();
  const { markAsRefreshed, markAsFailed } = useRefreshStatus();
  const {
    mutate: startRefresh,
    isPending,
    data,
    latestJob,
  } = useBulkMemberRefresh();

  const currentJob = useMemo(() => {
    return data?.data || latestJob;
  }, [data?.data, latestJob]);

  const nextAvailableAt = useMemo(() => {
    if (!currentJob?.createdAt) return null;
    const jobCreatedAt = new Date(currentJob.createdAt).getTime();
    const nextAvailable = jobCreatedAt + ADMIN_BULK_REFRESH_RATE_LIMIT;
    return new Date(nextAvailable).toISOString();
  }, [currentJob]);

  const countdown = useCountdown(nextAvailableAt);

  const currentJobId = useMemo(() => {
    if (countdown.isExpired) return undefined;
    return currentJob?.id;
  }, [currentJob?.id, countdown.isExpired]);

  const handleRefreshedIds = useCallback(
    (ids: string[]) => {
      markAsRefreshed(ids);
    },
    [markAsRefreshed]
  );

  const handleFailedIds = useCallback(
    (ids: string[]) => {
      markAsFailed(ids);
    },
    [markAsFailed]
  );

  const { jobStatus } = useRefreshJob(
    guildId,
    currentJobId,
    handleRefreshedIds,
    handleFailedIds
  );

  const displayJob = jobStatus || currentJob;
  const isRefreshing =
    displayJob?.status === "PROCESSING" || displayJob?.status === "PENDING";
  const progress = displayJob
    ? (displayJob.processedMembers / displayJob.totalMembers) * 100
    : 0;

  const handleRefresh = () => {
    startRefresh();
  };

  if (isRefreshing && displayJob) {
    return (
      <div className="flex flex-col gap-2 min-w-48">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>
            Odświeżanie {displayJob.processedMembers}/{displayJob.totalMembers}
          </span>
        </div>
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (!countdown.isExpired) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>
          Kolejne odświeżenie za {countdown.minutes}:
          {countdown.seconds.toString().padStart(2, "0")}
        </span>
      </div>
    );
  }

  if (displayJob?.status === "COMPLETED" && !countdown.isExpired) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600">
        <RefreshCw className="w-4 h-4" />
        <span>Odświeżono pomyślnie</span>
      </div>
    );
  }

  if (displayJob?.status === "FAILED") {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-red-600">Błąd odświeżania</span>
        <Button
          size="sm"
          variant="outline"
          onClick={handleRefresh}
          disabled={isPending || !countdown.isExpired}
        >
          <RefreshCw
            className={cn("w-4 h-4 mr-2", isPending && "animate-spin")}
          />
          Spróbuj ponownie
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleRefresh}
      disabled={isPending || !countdown.isExpired}
    >
      <RefreshCw className={cn("w-4 h-4 mr-2", isPending && "animate-spin")} />
      Odśwież wszystkich
    </Button>
  );
};
