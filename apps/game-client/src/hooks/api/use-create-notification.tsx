import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import type { Npc } from "@/utils/game/get-battle-participants";

type UseCreateNotificationOptions = {
  npc?: Npc;
  guildIds: string[];
  world: string;
  message?: string;
  isGatheringParty?: boolean;
};

type CreateNotificationResponse = {
  notificationId: string;
  guildIds?: string[];
};

export const useCreateNotification = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["create-notification"],
    mutationFn: (options: UseCreateNotificationOptions) =>
      client.post<CreateNotificationResponse>("/messaging", options),
  });

  return mutation;
};
