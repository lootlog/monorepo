import { useMutation } from "@tanstack/react-query";
import { useAuthenticatedApiClient } from "@/hooks/api/use-api-client";
import { QUERY_KEY } from "./use-chat-messages";

export enum MessageType {
  NORMAL = "NORMAL",
  NOTIFICATION = "NOTIFICATION",
  NPC = "NPC",
  PARTY_GATHERING = "PARTY_GATHERING",
}

export type PartyGatheringChatData = {
  notificationId: string;
  discordId: string;
  description?: string;
  minLvl?: number;
  maxLvl?: number;
  world: string;
};

export type ChatCharacterData = {
  nick: string;
  id: number;
  acc: number;
  lvl: number;
  prof: string;
  icon: string;
};

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
  characterData: ChatCharacterData;
  npc?: ChatNpc;
  partyGathering?: PartyGatheringChatData;
};

export const useSendChatMessage = () => {
  const { client } = useAuthenticatedApiClient();

  const mutation = useMutation({
    mutationKey: [QUERY_KEY],
    mutationFn: async ({
      message,
      guildIds,
      type,
      characterData,
      npc,
      partyGathering,
    }: UseSendChatMessageOptions) => {
      const results = await Promise.allSettled(
        guildIds.map((guildId) =>
          client.post(`/guilds/${guildId}/chat-messages`, {
            message,
            type,
            characterData,
            npc,
            partyGathering,
          }),
        ),
      );

      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        console.warn(`Failed to send chat message to ${failures.length} guilds`);
      }

      return results;
    },
    onError: (error) => {
      console.error("Chat message error:", error);
      window.message("Nie udało się wysłać wiadomości na czat");
    },
  });

  return mutation;
};
