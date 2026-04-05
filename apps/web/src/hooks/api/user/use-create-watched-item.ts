import type { UserWatchedItem } from "@/hooks/api/user/use-user-notifications";
import { createUserNotificationMutation } from "./create-user-notification-mutation";

export type CreateWatchedItemData = {
  itemId: number;
  itemName: string;
  world: string;
  guildIds: string[];
};

export const useCreateWatchedItem = createUserNotificationMutation<
  CreateWatchedItemData,
  UserWatchedItem
>((data, client) =>
  client.post("/users/@me/notifications/watched-items", data),
);
