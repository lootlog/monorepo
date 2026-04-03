import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateUserNotificationQueries } from "@/hooks/api/user/use-user-notifications";
import { apiClient } from "@/lib/api-client/api-client";

export type DeleteWatchedItemData = {
  watchedItemId: number;
};

export const useDeleteWatchedItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: DeleteWatchedItemData) => {
      const response = await apiClient.delete<{ success: true }>(
        `/users/@me/notifications/watched-items/${data.watchedItemId}`,
      );

      return response.data;
    },
    onSuccess: async () => {
      await invalidateUserNotificationQueries(queryClient);
    },
  });
};
