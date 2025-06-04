import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";

export type UseSendChatMessageOptions = {
  message: string;
  guildId: string;
};

export const useSendChatMessage = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: ["chat-message"],
    mutationFn: ({ message, guildId }: UseSendChatMessageOptions) => {
      return client.post(`/guilds/${guildId}/chat-messages`, { message });
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
