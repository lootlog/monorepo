import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  useNotificationsGuildControllerCancelGuildJob,
  type NotificationJobsResponseDto,
} from "@lootlog/client/main";
import { getApiErrorMessage } from "@lootlog/client/transport";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getGuildNotificationMutationCallbacks,
  prepareGuildNotificationMutation,
  removeGuildNotificationJobFromCache,
  type GuildNotificationCacheSnapshot,
} from "../notifications-api";
import { NotificationPendingJobTile } from "./notification-pending-job-tile";
import { NotificationsSection } from "./notifications-section";

type NotificationsPendingJobsSectionProps = {
  pendingJobs: NotificationJobsResponseDto["pending"];
};

export const NotificationsPendingJobsSection = ({
  pendingJobs,
}: NotificationsPendingJobsSectionProps) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  const cancelGuildJob = useNotificationsGuildControllerCancelGuildJob<
    unknown,
    GuildNotificationCacheSnapshot | undefined
  >({
    mutation: {
      onMutate: async (variables) => {
        if (!guildId) {
          return undefined;
        }

        const previousNotifications = await prepareGuildNotificationMutation(
          queryClient,
          guildId,
        );

        removeGuildNotificationJobFromCache(
          queryClient,
          guildId,
          variables.pathParams.jobId,
        );

        return previousNotifications;
      },
      ...getGuildNotificationMutationCallbacks(queryClient, guildId),
    },
  });

  const handleCancelJob = async (jobId: string) => {
    if (!guildId) {
      const error = new Error("Missing guild id.");
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.jobCancelError"),
      );
      throw error;
    }

    try {
      await cancelGuildJob.mutateAsync({
        pathParams: { guildId, jobId },
      });
      toast.success(t("settings.notifications.toasts.jobCanceled"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.jobCancelError"),
      );
      throw error;
    }
  };

  return (
    <NotificationsSection
      id="notifications-pending"
      title={t("settings.notifications.jobs.pending")}
      count={pendingJobs.length}
      emptyLabel={
        pendingJobs.length === 0
          ? t("settings.notifications.empty.pendingJobs")
          : undefined
      }
    >
      {pendingJobs.map((job) => (
        <NotificationPendingJobTile
          key={job.id}
          job={job}
          cancelDisabled={cancelGuildJob.isPending}
          onCancel={() => handleCancelJob(job.id)}
        />
      ))}
    </NotificationsSection>
  );
};
