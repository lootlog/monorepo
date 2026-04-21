import {
  chatControllerGetChatMessages,
  chatControllerSendChatMessage,
} from "@/lib/api/generated/main/chat/chat";
import {
  type ChatMessageResponseDtoOutput,
  SendMessageDtoType,
  type SendMessageDtoCharacterData,
  type SendMessageDtoNpc,
  type SendMessageDtoPartyGathering,
} from "@/lib/api/generated/main/model";
import {
  getAggregateActionStatus,
  getErrorMessage,
  runLoggedRequest,
  startLoggedAction,
} from "@/lib/logs/log-actions";

export const MessageType = SendMessageDtoType;

export type MessageType = (typeof MessageType)[keyof typeof MessageType];
export type ChatCharacterData = SendMessageDtoCharacterData;
export type ChatNpc = SendMessageDtoNpc;
export type PartyGatheringChatData = SendMessageDtoPartyGathering;
export type ChatMessage = ChatMessageResponseDtoOutput;

export async function fetchChatMessages(
  guildId: string,
): Promise<ChatMessage[]> {
  return chatControllerGetChatMessages({ guildId });
}

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
