import { useApiClient } from "@/hooks/api/use-api-client";
import { authClient } from "@/lib/auth-client";
import { persister } from "@/lib/query-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useDeleteAccount = () => {
  const { client } = useApiClient();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["delete-account"],
    mutationFn: async () => {
      await client.delete("/users/@me");

      const deleteUserResponse = await authClient.deleteUser();

      if (
        typeof deleteUserResponse === "object" &&
        deleteUserResponse !== null &&
        "error" in deleteUserResponse &&
        deleteUserResponse.error
      ) {
        const error = deleteUserResponse.error;
        const errorMessage =
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
            ? error.message
            : "Failed to delete auth account";

        throw new Error(errorMessage);
      }

      queryClient.clear();
      await persister.removeClient();
      window.location.replace("/");
    },
  });
};
