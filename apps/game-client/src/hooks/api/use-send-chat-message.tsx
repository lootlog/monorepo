import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type UseSendChatMessageOptions = {
  message: string;
  guildIds: string[];
};

export const useSendChatMessage = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["chat-message"],
    mutationFn: ({ message, guildIds }: UseSendChatMessageOptions) => {
      return Promise.all(
        guildIds.map((guildId) =>
          client.post(`/guilds/${guildId}/chat-messages`, { message })
        )
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
