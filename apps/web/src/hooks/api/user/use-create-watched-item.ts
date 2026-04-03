import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserWatchedItem } from "@/hooks/api/user/use-user-notifications";
import { invalidateUserNotificationQueries } from "@/hooks/api/user/use-user-notifications";
import { apiClient } from "@/lib/api-client/api-client";

export type CreateWatchedItemData = {
  itemId: number;
  itemName: string;
  itemIcon?: string;
  world: string;
  guildIds: string[];
};

export const useCreateWatchedItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateWatchedItemData) => {
      const response = await apiClient.post<UserWatchedItem>(
        "/users/@me/notifications/watched-items",
        data,
      );

      return response.data;
    },
    onSuccess: async () => {
      await invalidateUserNotificationQueries(queryClient);
    },
  });
};
