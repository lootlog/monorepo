import { Button } from "@lootlog/ui/components/button";
import { RefreshCw, Clock } from "lucide-react";
import { useGuildId } from "@/hooks/context/use-guild-id";
import { cn } from "@/utils/cn";
import { useRefreshStatus } from "@/features/guild/settings/members/contexts/refresh-status-context";
import { useCountdown } from "@/hooks/utils/use-countdown";
import { useRefreshJob } from "@/hooks/utils/use-refresh-job";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/features/guild/events/utils/get-api-error-message";
import {
  getMembersControllerGetGuildMembersQueryKey,
  getMembersControllerGetLatestRefreshJobQueryKey,
  useMembersControllerGetLatestRefreshJob,
  useMembersControllerRefreshAllMembers,
} from "@/lib/api/generated/main/members/members";
import { useQueryClient } from "@tanstack/react-query";

export const RefreshMembersButton = () => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();
  const { markAsRefreshed, markAsFailed } = useRefreshStatus();
  const latestRefreshJobQuery = useMembersControllerGetLatestRefreshJob(
    { guildId: guildId ?? "" },
    {
      query: {
        queryKey: getMembersControllerGetLatestRefreshJobQueryKey({
          guildId: guildId ?? "",
        }),
        staleTime: 60_000,
      },
    },
  );
  const refreshAllMembersMutation = useMembersControllerRefreshAllMembers({
    mutation: {
      onSuccess: (_data, variables) => {
        const currentGuildId = variables?.pathParams.guildId;

        toast.success(t("settings.members.refreshStarted"));

        if (!currentGuildId) {
          return;
        }

        void Promise.all([
          queryClient.invalidateQueries({
            queryKey: getMembersControllerGetGuildMembersQueryKey({
              guildId: currentGuildId,
            }),
          }),
          queryClient.invalidateQueries({
            queryKey: getMembersControllerGetLatestRefreshJobQueryKey({
              guildId: currentGuildId,
            }),
          }),
        ]);
      },
      onError: (error, variables) => {
        const message = getApiErrorMessage(error);
        if (message === "BULK_REFRESH_RATE_LIMIT_ACTIVE") {
          const currentGuildId = variables?.pathParams.guildId;

          if (currentGuildId) {
            void queryClient.invalidateQueries({
              queryKey: getMembersControllerGetLatestRefreshJobQueryKey({
                guildId: currentGuildId,
              }),
            });
          }

          toast.error(t("settings.members.refreshRateLimit"));
          return;
        }

        toast.error(t("settings.members.refreshStartError"));
      },
    },
  });

  const latestJob = latestRefreshJobQuery.data;
  const isPending = refreshAllMembersMutation.isPending;
  const data = refreshAllMembersMutation.data;

  const currentJob = data ?? latestJob;
  const nextAvailableAt = currentJob?.nextAvailableAt ?? null;
  const countdown = useCountdown(nextAvailableAt);
  const currentJobId = countdown.isExpired ? undefined : currentJob?.id;

  const { jobStatus } = useRefreshJob(
    guildId,
    currentJobId,
    markAsRefreshed,
    markAsFailed,
  );

  const displayJob = jobStatus ?? currentJob;
  const isRefreshing =
    displayJob?.status === "PROCESSING" || displayJob?.status === "PENDING";
  const progress =
    displayJob && displayJob.totalMembers > 0
      ? (displayJob.processedMembers / displayJob.totalMembers) * 100
      : 0;

  const handleRefresh = () => {
    if (!guildId) {
      return;
    }

    refreshAllMembersMutation.mutate({
      pathParams: { guildId },
    });
  };

  if (isRefreshing && displayJob) {
    return (
      <div className="flex flex-col gap-2 min-w-48">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>
            {t("settings.members.refreshingProgress", {
              processed: displayJob.processedMembers,
              total: displayJob.totalMembers,
            })}
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
    if (displayJob?.status === "COMPLETED") {
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-green-600">
          <RefreshCw className="w-4 h-4" />
          <span>
            {t("settings.members.refreshSuccessWithCooldown", {
              minutes: countdown.minutes,
              seconds: countdown.seconds.toString().padStart(2, "0"),
            })}
          </span>
        </div>
      );
    }

    if (displayJob?.status === "FAILED") {
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-red-600">
          <Clock className="w-4 h-4" />
          <span>
            {t("settings.members.refreshErrorWithCooldown", {
              minutes: countdown.minutes,
              seconds: countdown.seconds.toString().padStart(2, "0"),
            })}
          </span>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Clock className="w-4 h-4" />
        <span>
          {t("settings.members.nextRefreshIn", {
            minutes: countdown.minutes,
            seconds: countdown.seconds.toString().padStart(2, "0"),
          })}
        </span>
      </div>
    );
  }

  if (displayJob?.status === "FAILED") {
    return (
      <Button
        size="sm"
        variant="secondary"
        onClick={handleRefresh}
        disabled={isPending || !countdown.isExpired}
      >
        <RefreshCw
          className={cn("w-4 h-4 mr-2", isPending && "animate-spin")}
        />
        <span className="mr-1 font-medium">
          {t("settings.members.refreshError")}
        </span>
        <span className="opacity-70">·</span>
        <span className="ml-1">{t("settings.members.retry")}</span>
      </Button>
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
      {t("settings.members.refreshAll")}
    </Button>
  );
};
