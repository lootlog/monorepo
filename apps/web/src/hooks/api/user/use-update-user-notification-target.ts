import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  invalidateUserNotificationQueries,
  type UserNotificationTarget,
} from "@/hooks/api/user/use-user-notifications";
import { apiClient } from "@/lib/api-client/api-client";

export type UpdateUserNotificationTargetData = {
  targetId: number;
  displayName?: string | null;
  active?: boolean;
};

export const useUpdateUserNotificationTarget = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateUserNotificationTargetData) => {
      const response = await apiClient.patch<UserNotificationTarget>(
        `/users/@me/notifications/targets/${data.targetId}`,
        {
          displayName: data.displayName,
          active: data.active,
        },
      );

      return response.data;
    },
    onSuccess: async () => {
      await invalidateUserNotificationQueries(queryClient);
    },
  });
};
