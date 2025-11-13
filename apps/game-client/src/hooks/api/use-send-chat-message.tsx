import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { QUERY_KEY } from "./use-chat-messages";

export enum MessageType {
  NORMAL = "NORMAL",
  NOTIFICATION = "NOTIFICATION",
  NPC = "NPC",
}

export type ChatNpc = {
  icon: string;
  id: number;
  x: number;
  y: number;
  hpp: number;
  name: string;
  prof: string;
  location: string;
  type: number;
  wt: number;
  lvl: number;
};

export type UseSendChatMessageOptions = {
  message: string;
  guildIds: string[];
  type: MessageType;
  npc?: ChatNpc;
};

export const useSendChatMessage = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: [QUERY_KEY],
    mutationFn: ({
      message,
      guildIds,
      type,
      npc,
    }: UseSendChatMessageOptions) => {
      return Promise.all(
        guildIds.map((guildId) =>
          client.post(`/guilds/${guildId}/chat-messages`, {
            message,
            type,
            npc,
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
