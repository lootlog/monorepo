import { useApiClient } from "@/hooks/api/use-api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export type UserPreferences = {
  guildsOrder: string[];
};

export const useUpdateUserPreferences = () => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["update-user-preferences"],
    mutationFn: async (preferences: UserPreferences) => {
      return client.patch("/users/@me/preferences", {
        ...preferences,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-preferences"] });
    },
  });
};
