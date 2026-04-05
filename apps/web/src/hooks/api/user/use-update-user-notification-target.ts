import type { UserNotificationTarget } from "@/hooks/api/user/use-user-notifications";
import { createUserNotificationMutation } from "./create-user-notification-mutation";

export type UpdateUserNotificationTargetData = {
  targetId: number;
  displayName?: string | null;
  active?: boolean;
};

export const useUpdateUserNotificationTarget = createUserNotificationMutation<
  UpdateUserNotificationTargetData,
  UserNotificationTarget
>((data, client) =>
  client.patch(`/users/@me/notifications/targets/${data.targetId}`, {
    displayName: data.displayName,
    active: data.active,
  }),
);
