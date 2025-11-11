import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type UseSendChatMessageOptions = {
  message: string;
  notification: boolean;
  guildIds: string[];
};

export const useSendChatMessage = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["chat-message"],
    mutationFn: ({
      message,
      notification,
      guildIds,
    }: UseSendChatMessageOptions) => {
      return Promise.all(
        guildIds.map((guildId) =>
          client.post(`/guilds/${guildId}/chat-messages`, {
            message,
            notification,
          }),
        ),
      );
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
