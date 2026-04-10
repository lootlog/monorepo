import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateUserNotificationQueries } from "@/hooks/api/user/use-user-notifications";
import { apiClient } from "@/lib/api-client/api-client";

export type TriggerUserNotificationTargetTestData = {
  targetId: number;
};

export const useTriggerUserNotificationTargetTest = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: TriggerUserNotificationTargetTestData) => {
      const response = await apiClient.post<{ success: true }>(
        `/users/@me/notifications/targets/${data.targetId}/test`,
      );

      return response;
    },
    onSuccess: async () => {
      await invalidateUserNotificationQueries(queryClient);
    },
  });
};
