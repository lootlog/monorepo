import { useGuildId } from "@/hooks/context/use-guild-id";
import { useNotificationsGuildControllerCancelGuildJob } from "@lootlog/client/main";
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

/** Cancels a queued delivery, dropping it from the cached queue at once. */
export const useCancelNotificationJob = () => {
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

  const cancelJob = async (jobId: string) => {
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

  return { cancelJob, isCanceling: cancelGuildJob.isPending };
};
