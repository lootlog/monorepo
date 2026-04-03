import { NotificationTargetType } from "@lootlog/types";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserNotificationTarget } from "@/hooks/api/user/use-user-notifications";
import { invalidateUserNotificationQueries } from "@/hooks/api/user/use-user-notifications";
import { apiClient } from "@/lib/api-client/api-client";

export type CreateUserNotificationTargetData = {
  displayName?: string | null;
};

export const useCreateUserNotificationTarget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserNotificationTargetData = {}) => {
      const response = await apiClient.post<UserNotificationTarget>(
        "/users/@me/notifications/targets",
        {
          targetType: NotificationTargetType.DM,
          ...data,
        },
      );

      return response.data;
    },
    onSuccess: async () => {
      await invalidateUserNotificationQueries(queryClient);
    },
  });
};
