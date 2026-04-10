import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateUserNotificationQueries } from "@/hooks/api/user/use-user-notifications";
import { apiClient, type ApiClient } from "@/lib/api-client/api-client";

export function createUserNotificationMutation<TData, TResponse>(
  mutationFn: (data: TData, client: ApiClient) => Promise<TResponse>,
) {
  return () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (data: TData) => mutationFn(data, apiClient),
      onSuccess: async () => {
        await invalidateUserNotificationQueries(queryClient);
      },
    });
  };
}
