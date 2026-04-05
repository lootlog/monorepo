import { createUserNotificationMutation } from "./create-user-notification-mutation";

export type DeleteWatchedItemData = {
  watchedItemId: number;
};

export const useDeleteWatchedItem = createUserNotificationMutation<
  DeleteWatchedItemData,
  { success: true }
>((data, client) =>
  client.delete(`/users/@me/notifications/watched-items/${data.watchedItemId}`),
);
