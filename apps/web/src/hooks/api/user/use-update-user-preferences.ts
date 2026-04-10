import { useApiClient } from "@/hooks/api/use-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { mutationKeys, queryKeys } from "@/lib/query-keys";

export type UpdateUserPreferences = {
  guildsOrder?: string[];
  theme?: string;
  colorMode?: string;
};

export const useUpdateUserPreferences = () => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.user.updatePreferences(),
    mutationFn: (preferences: UpdateUserPreferences) => {
      return client.patch("/users/@me/preferences", {
        ...preferences,
      });
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.user.preferences(), response);
    },
  });
};
