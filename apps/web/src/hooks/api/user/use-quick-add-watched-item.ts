import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserWatchedItem } from "@/hooks/api/user/use-user-notifications";
import { invalidateUserNotificationQueries } from "@/hooks/api/user/use-user-notifications";
import { apiClient } from "@/lib/api-client/api-client";

export type QuickAddWatchedItemData = {
  itemId: number;
  itemName: string;
  world: string;
  guildId: string;
};

export const useQuickAddWatchedItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: QuickAddWatchedItemData) => {
      const response = await apiClient.post<UserWatchedItem>(
        "/users/@me/notifications/watched-items/quick-add",
        data,
      );

      return response.data;
    },
    onSuccess: async () => {
      await invalidateUserNotificationQueries(queryClient);
    },
  });
};
