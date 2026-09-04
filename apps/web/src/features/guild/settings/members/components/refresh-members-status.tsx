import { Button } from "@lootlog/ui/components/button";
import { Progress } from "@lootlog/ui/components/progress";
import { Clock, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "cn";

type RefreshDisplayJob = {
  status: string;
  processedMembers: number;
  totalMembers: number;
};

type RefreshCountdown = {
  isExpired: boolean;
  minutes: number;
  seconds: number;
};

type RefreshMembersStatusProps = {
  countdown: RefreshCountdown;
  displayJob: RefreshDisplayJob | null | undefined;
  isPending: boolean;
  onRefresh: () => void;
};

const getRefreshProgress = (job: RefreshDisplayJob) => {
  if (job.totalMembers <= 0) return 0;
  return (job.processedMembers / job.totalMembers) * 100;
};

export const RefreshMembersStatus = ({
  countdown,
  displayJob,
  isPending,
  onRefresh,
}: RefreshMembersStatusProps) => {
  const { t } = useTranslation();
  const isRefreshing =
    displayJob?.status === "PROCESSING" || displayJob?.status === "PENDING";

  if (isRefreshing && displayJob) {
    return (
      <div className="flex min-w-48 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" />
          <span>
            {t("settings.members.refreshingProgress", {
              processed: displayJob.processedMembers,
              total: displayJob.totalMembers,
            })}
          </span>
        </div>
        <Progress
          value={getRefreshProgress(displayJob)}
          aria-label={t("settings.members.refreshingProgress", {
            processed: displayJob.processedMembers,
            total: displayJob.totalMembers,
          })}
          className="[&_[data-slot=progress-track]]:h-1.5"
        />
      </div>
    );
  }

  if (!countdown.isExpired) {
    if (displayJob?.status === "COMPLETED") {
      return (
        <div className="flex flex-wrap items-center gap-2 text-sm text-green-600">
          <RefreshCw className="size-4" />
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
          <Clock className="size-4" />
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
        <Clock className="size-4" />
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
        onClick={onRefresh}
        disabled={isPending || !countdown.isExpired}
      >
        <RefreshCw className={cn("mr-2 size-4", isPending && "animate-spin")} />
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
      onClick={onRefresh}
      disabled={isPending || !countdown.isExpired}
    >
      <RefreshCw className={cn("mr-2 size-4", isPending && "animate-spin")} />
      {t("settings.members.refreshAll")}
    </Button>
  );
};
