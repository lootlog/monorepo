import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import type { Npc } from "@/utils/game/get-battle-participants";

export type UseCreateNotificationOptions = {
  npc?: Npc;
  guildIds: string[];
  world: string;
  message?: string;
  isGatheringParty?: boolean;
};

export type CreateNotificationResponse = {
  notificationId: string;
  guildIds?: string[];
};

export const useCreateNotification = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["create-notification"],
    mutationFn: (options: UseCreateNotificationOptions) =>
      client.post<CreateNotificationResponse>("/notifications", options),
    onSuccess: () => {
      console.log("onSuccess");
    },
    onError: () => {
      console.log("onError");
    },
  });

  return mutation;
};
