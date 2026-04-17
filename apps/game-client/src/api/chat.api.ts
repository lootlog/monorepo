import { getApiClient } from "@/lib/api-client";
import {
  getAggregateActionStatus,
  runLoggedRequest,
  startLoggedAction,
} from "@/lib/logs/log-actions";

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

export type ChatMessage = {
  id: string;
  guildId: string;
  message: string;
  senderId: string;
  timestamp: string;
  type: MessageType;
  characterData: ChatCharacterData;
  npc?: ChatNpc;
  partyGathering?: PartyGatheringChatData;
};

export async function fetchChatMessages(
  guildId: string,
): Promise<ChatMessage[]> {
  const client = getApiClient("default");
  const response = await client.get<ChatMessage[]>(
    `/guilds/${guildId}/chat-messages`,
  );

  return response.data;
}

type SendChatMessageResponse = {
  id: string;
};

export type SendChatMessageOptions = {
  message: string;
  guildIds: string[];
  type: MessageType;
  characterData: ChatCharacterData;
  npc?: ChatNpc;
  partyGathering?: PartyGatheringChatData;
};

export type SendChatMessageSuccess = {
  guildId: string;
  messageId: string;
};

export type SendChatMessageResult =
  PromiseSettledResult<SendChatMessageSuccess>;

export async function sendChatMessage({
  message,
  guildIds,
  type,
  characterData,
  npc,
  partyGathering,
}: SendChatMessageOptions): Promise<SendChatMessageResult[]> {
  const client = getApiClient("default");
  const action = startLoggedAction({
    actionType: "send_chat_message",
    payload: {
      message,
      guildIds,
      type,
      characterData,
      npc,
      partyGathering,
    },
  });

  const results = await Promise.allSettled(
    guildIds.map(async (guildId) => {
      const endpoint = `/guilds/${guildId}/chat-messages`;
      const payload = {
        message,
        type,
        characterData,
        npc,
        partyGathering,
      };

      const response = await runLoggedRequest({
        action,
        method: "POST",
        endpoint,
        payload,
        request: () => client.post<SendChatMessageResponse>(endpoint, payload),
      });

      return { guildId, messageId: response.data.id };
    }),
  );

  const successCount = results.filter(
    (result) => result.status === "fulfilled",
  ).length;
  const failureCount = results.length - successCount;

  action.complete({
    status: getAggregateActionStatus(successCount, failureCount),
    details: {
      endpoint: "/guilds/:guildId/chat-messages",
      totalRequests: results.length,
      successCount,
      failureCount,
      guildIds,
    },
  });

  if (failureCount === results.length) {
    throw new Error("Failed to send chat message to all guilds");
  }

  if (failureCount > 0) {
    console.warn(`Failed to send chat message to ${failureCount} guilds`);
  }

  return results;
}
