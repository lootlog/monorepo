import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type UseCreateTimerOptions = {
  name: string;
  respBaseSeconds: number;
  respawnRandomness: number;
  world: string;
  guildId: string;
};

export const useCreateManualTimer = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["create-manual-timer"],
    mutationFn: ({ guildId, ...rest }: UseCreateTimerOptions) =>
      client.post(`/guilds/${guildId}/timers`, rest),
    onSuccess: () => {
      console.log("onSuccess");
    },
    onError: () => {
      console.log("onError");
    },
  });

  return mutation;
};
