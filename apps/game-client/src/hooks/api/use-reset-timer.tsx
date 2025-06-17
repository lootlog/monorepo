import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type UseResetTimerOptions = {
  world: string;
  npcId: number;
  characterId: string;
  accountId: string;
};

export const useResetTimer = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["reset-timer"],
    mutationFn: (options: UseResetTimerOptions) =>
      client.patch("/timers", options),
    onSuccess: () => {
      console.log("onSuccess");
    },
    onError: () => {
      console.log("onError");
    },
  });

  return mutation;
};
