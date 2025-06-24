import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type UseResetTimerOptions = {
  world: string;
  npcId: number;
  guildId: string;
};

export const useResetTimer = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["reset-timer"],
    mutationFn: ({ guildId, npcId, ...rest }: UseResetTimerOptions) =>
      client.patch(`/guilds/${guildId}/timers/${npcId}/reset`, rest),
    onSuccess: () => {
      console.log("onSuccess");
    },
    onError: () => {
      console.log("onError");
    },
  });

  return mutation;
};
