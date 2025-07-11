import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type UpdateLootOptions = {
  msg: string;
  id: number;
};

export const useUpdateLoot = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["update-loot"],
    mutationFn: ({ id, ...rest }: UpdateLootOptions) => {
      return client.patch(`/loots/${id}`, rest);
    },
    onSuccess: () => {
      console.log("onSuccess");
    },
    onError: () => {
      console.log("onError");
    },
  });

  return mutation;
};
