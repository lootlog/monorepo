import { useMutation, useQueryClient } from "@tanstack/react-query";
import { invalidateUserNotificationQueries } from "@/hooks/api/user/use-user-notifications";
import { apiClient } from "@/lib/api-client/api-client";
import type { AxiosResponse } from "axios";

export function createUserNotificationMutation<TData, TResponse>(
  mutationFn: (
    data: TData,
    client: typeof apiClient,
  ) => Promise<AxiosResponse<TResponse>>,
) {
  return () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (data: TData) => {
        const response = await mutationFn(data, apiClient);
        return response.data;
      },
      onSuccess: async () => {
        await invalidateUserNotificationQueries(queryClient);
      },
    });
  };
}
