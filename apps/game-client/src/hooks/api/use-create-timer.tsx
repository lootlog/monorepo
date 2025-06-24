import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type UseCreateTimerOptions = {
  respawnRandomness?: number;
  respBaseSeconds: number;
  characterId: string;
  accountId: string;
  world: string;
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
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["create-timer"],
    mutationFn: (options: UseCreateTimerOptions) =>
      client.post("/timers", options),
    onSuccess: () => {
      console.log("onSuccess");
    },
    onError: () => {
      console.log("onError");
    },
  });

  return mutation;
};
