import { NotificationTargetType } from "@lootlog/types";
import type { UserNotificationTarget } from "@/hooks/api/user/use-user-notifications";
import { createUserNotificationMutation } from "./create-user-notification-mutation";

export type CreateUserNotificationTargetData = {
  displayName?: string | null;
};

export const useCreateUserNotificationTarget = createUserNotificationMutation<
  CreateUserNotificationTargetData,
  UserNotificationTarget
>((data, client) =>
  client.post("/users/@me/notifications/targets", {
    targetType: NotificationTargetType.DM,
    ...data,
  }),
);
