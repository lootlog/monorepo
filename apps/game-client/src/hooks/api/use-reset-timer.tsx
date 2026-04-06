import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type UseResetTimerOptions = {
  world: string;
  timerKey: string;
  guildId: string;
};

export const useResetTimer = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["reset-timer"],
    mutationFn: ({ guildId, timerKey, ...rest }: UseResetTimerOptions) =>
      client.patch(`/guilds/${guildId}/timers/${timerKey}/reset`, rest),
  });

  return mutation;
};
