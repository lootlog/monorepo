import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type UseDeleteTimerOptions = {
  npcId: number;
  guildId: string;
  world?: string;
};

export const useDeleteTimer = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["delete-timer"],
    mutationFn: ({ guildId, npcId, world }: UseDeleteTimerOptions) =>
      client.delete(`/guilds/${guildId}/timers/${npcId}?world=${world}`),
    onSuccess: () => {
      console.log("onSuccess");
    },
    onError: () => {
      console.log("onError");
    },
  });

  return mutation;
};
