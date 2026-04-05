import type { UserWatchedItem } from "@/hooks/api/user/use-user-notifications";
import { createUserNotificationMutation } from "./create-user-notification-mutation";

export type QuickAddWatchedItemData = {
  itemId: number;
  itemName: string;
  world: string;
  guildId: string;
};

export const useQuickAddWatchedItem = createUserNotificationMutation<
  QuickAddWatchedItemData,
  UserWatchedItem
>((data, client) =>
  client.post("/users/@me/notifications/watched-items/quick-add", data),
);
