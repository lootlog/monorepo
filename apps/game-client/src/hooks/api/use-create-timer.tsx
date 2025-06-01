import { useMutation } from "@tanstack/react-query";
import { useGuilds } from "@/hooks/api/use-guilds";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type UseCreateTimerOptions = {
  respawnRandomness?: number;
  respBaseSeconds: number;
  npc: {
    id: number;
    name: string;
    icon: string;
    prof: string;
    type: number;
    lvl: number;
    location: string;
    hpp: number;
    wt: number;
  };
};

export const useCreateTimer = () => {
  const { data: guilds } = useGuilds();
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["create-timer"],
    mutationFn: (options: UseCreateTimerOptions) => {
      const promiseArr =
        guilds?.forEach((guild) => {
          return client.post(`/guilds/${guild.id}/timers`, options);
        }) ?? [];

      return Promise.all(promiseArr);
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
