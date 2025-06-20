import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { Npc } from "@/utils/game/get-battle-participants";

export type UseCreateNotificationOptions = {
  npc?: Npc;
  guildIds: string[];
  world: string;
  message?: string;
};

export const useCreateNotification = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["create-notification"],
    mutationFn: (options: UseCreateNotificationOptions) =>
      client.post("/notifications", options),
    onSuccess: () => {
      console.log("onSuccess");
    },
    onError: () => {
      console.log("onError");
    },
  });

  return mutation;
};
