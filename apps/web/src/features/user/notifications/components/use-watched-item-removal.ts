import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "@lootlog/ui/lib/toast";
import {
  useNotificationsUserControllerDeleteWatchedItem,
  type WatchedItemResponseDto,
} from "@lootlog/client/main";
import { getUserNotificationsErrorMessage } from "@/lib/user-notifications/get-user-notifications-error-message";
import { invalidateUserNotificationQueries } from "@/lib/user-notifications/invalidate-user-notification-queries";

const UNDO_WINDOW_MS = 5000;

export const useWatchedItemRemoval = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const deleteWatchedItem = useNotificationsUserControllerDeleteWatchedItem();

  const [removingIds, setRemovingIds] = useState<ReadonlySet<number>>(
    () => new Set(),
  );

  const setRemoving = (watchedItemId: number, removing: boolean) =>
    setRemovingIds((current) => {
      const next = new Set(current);

      if (removing) next.add(watchedItemId);
      else next.delete(watchedItemId);

      return next;
    });

  const remove = (watchedItem: WatchedItemResponseDto) => {
    let settled = false;

    const settle = () => {
      if (settled) return false;
      settled = true;

      return true;
    };

    const commit = async () => {
      if (!settle()) return;

      try {
        await deleteWatchedItem.mutateAsync({
          pathParams: { watchedItemId: watchedItem.id },
        });
        await invalidateUserNotificationQueries(queryClient);
      } catch (error) {
        setRemoving(watchedItem.id, false);
        toast.error(
          getUserNotificationsErrorMessage(error, t) ??
            t("settings.userNotifications.toasts.watchDeleteError"),
        );
      }
    };

    setRemoving(watchedItem.id, true);
    toast.success(t("settings.userNotifications.toasts.watchDeleted"), {
      duration: UNDO_WINDOW_MS,
      action: {
        label: t("common.actions.undo"),
        onClick: () => {
          if (settle()) setRemoving(watchedItem.id, false);
        },
      },
      onAutoClose: () => void commit(),
      onDismiss: () => void commit(),
    });
  };

  return { removingIds, remove };
};
