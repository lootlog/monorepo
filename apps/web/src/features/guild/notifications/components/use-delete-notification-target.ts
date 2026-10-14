import { useGuildId } from "@/hooks/context/use-guild-id";
import {
  useNotificationsGuildControllerDeleteGuildTarget,
  type NotificationTargetResponseDto,
} from "@lootlog/client/main";
import { getApiErrorMessage } from "@lootlog/client/transport";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  getGuildNotificationMutationCallbacks,
  prepareGuildNotificationMutation,
  removeGuildNotificationTargetFromCache,
  type GuildNotificationCacheSnapshot,
} from "../notifications-api";

/** Deletes a channel, dropping it from the cached lists at once; rejects on failure. */
export const useDeleteNotificationTarget = (
  target: NotificationTargetResponseDto,
) => {
  const { t } = useTranslation();
  const guildId = useGuildId();
  const queryClient = useQueryClient();

  const deleteTarget = useNotificationsGuildControllerDeleteGuildTarget<
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

        removeGuildNotificationTargetFromCache(
          queryClient,
          guildId,
          variables.pathParams.targetId,
        );

        return previousNotifications;
      },
      ...getGuildNotificationMutationCallbacks(queryClient, guildId),
    },
  });

  const handleDelete = async () => {
    if (!guildId) {
      const error = new Error("Missing guild id.");
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.targetDeleteError"),
      );
      throw error;
    }

    try {
      await deleteTarget.mutateAsync({
        pathParams: { guildId, targetId: target.id },
      });
      toast.success(t("settings.notifications.toasts.targetDeleted"));
    } catch (error) {
      toast.error(
        getApiErrorMessage(error) ??
          t("settings.notifications.toasts.targetDeleteError"),
      );
      throw error;
    }
  };

  return { handleDelete, isDeleting: deleteTarget.isPending };
};
