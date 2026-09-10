import {
  chatControllerSendChatMessage,
  type ChatMessageResponseDtoOutput,
  SendMessageDtoType,
  type SendMessageDtoCharacterData,
  type SendMessageDtoNpc,
} from "@lootlog/client/main";

import {
  getAggregateActionStatus,
  runLoggedRequest,
  startLoggedAction,
} from "@/lib/logs/log-actions";

export const MessageType = SendMessageDtoType;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];
export type ChatCharacterData = SendMessageDtoCharacterData;
export type ChatNpc = SendMessageDtoNpc;
export type ChatMessage = ChatMessageResponseDtoOutput;

export type SendChatMessageOptions = {
  message: string;
  guildIds: string[];
  type: MessageType;
  characterData: ChatCharacterData;
  npc?: ChatNpc;
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
}: SendChatMessageOptions): Promise<SendChatMessageResult[]> {
  const action = startLoggedAction({
    actionType: "send_chat_message",
    payload: {
      message,
      guildIds,
      type,
      characterData,
      npc,
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
      };

      const response = await runLoggedRequest({
        action,
        method: "POST",
        endpoint,
        payload,
        request: () => chatControllerSendChatMessage({ guildId }, payload),
      });

      return { guildId, messageId: response.id };
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
