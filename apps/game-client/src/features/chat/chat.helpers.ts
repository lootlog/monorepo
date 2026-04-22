import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@/lib/api/generated/main/model";
import type { ChatFilter } from "@/store/chat.store";
import { MessageType } from "@/api/chat.api";

export const getNextSelectedGuildId = (
  selectedGuildId: string | undefined,
  guilds?: { id: string }[],
) => {
  if (selectedGuildId || !guilds || guilds.length === 0) return undefined;
  return guilds[0].id;
};

export const getMessagesForSelectedGuild = (
  messageCache: Record<string, ChatMessageType[]>,
  selectedGuildId?: string,
) => {
  if (selectedGuildId === "all") {
    return Object.values(messageCache)
      .flat()
      .filter((message) => !!message.timestamp);
  }

  return (messageCache[selectedGuildId ?? ""] ?? []).filter(
    (message) => !!message.timestamp,
  );
};

export const deduplicateChatMessages = (messages: ChatMessageType[]) => {
  const unique: ChatMessageType[] = [];

  for (const message of messages) {
    const timestamp = new Date(message.timestamp).getTime();
    const dedupeKey = `${message.message?.trim() ?? ""}_${message.senderId}_${message.npc?.id ?? ""}`;

    const duplicate = unique.find(
      (existingMessage) =>
        `${existingMessage.message?.trim() ?? ""}_${existingMessage.senderId}_${existingMessage.npc?.id ?? ""}` ===
          dedupeKey &&
        Math.abs(new Date(existingMessage.timestamp).getTime() - timestamp) <=
          200,
    );

    if (!duplicate) {
      unique.push(message);
    }
  }

  return unique.sort(
    (firstMessage, secondMessage) =>
      new Date(firstMessage.timestamp).getTime() -
      new Date(secondMessage.timestamp).getTime(),
  );
};

export const filterChatMessages = (
  messages: ChatMessageType[],
  chatFilter: ChatFilter,
) => {
  if (chatFilter === "all") return messages;

  return messages.filter((message) => {
    switch (chatFilter) {
      case "normal":
        return (
          message.type === MessageType.NORMAL ||
          message.type === MessageType.NOTIFICATION
        );
      case "npc":
        return message.type === MessageType.NPC;
      case "party":
        return message.type === MessageType.PARTY_GATHERING;
      default:
        return true;
    }
  });
};

export const getCurrentChatMessages = (
  messageCache: Record<string, ChatMessageType[]>,
  selectedGuildId: string | undefined,
  chatFilter: ChatFilter,
) => {
  return filterChatMessages(
    deduplicateChatMessages(
      getMessagesForSelectedGuild(messageCache, selectedGuildId),
    ),
    chatFilter,
  );
};

export const hasVisibleChatMessages = (
  messages: ChatMessageType[],
  guildNamesById: Record<string, string>,
) => {
  return messages.some((message) => {
    return !!message.characterData && !!guildNamesById[message.guildId];
  });
};

export const upsertChatMessage = (
  messages: ChatMessageType[] = [],
  nextMessage: ChatMessageType,
) => {
  const existingMessageIndex = messages.findIndex(
    (message) => message.id === nextMessage.id,
  );

  if (existingMessageIndex === -1) {
    return [...messages, nextMessage];
  }

  return messages.map((message) =>
    message.id === nextMessage.id ? nextMessage : message,
  );
};

export const removeChatMessage = (
  messages: ChatMessageType[] = [],
  messageId: string,
) => {
  return messages.filter((message) => message.id !== messageId);
};

export const updateChatMessage = (
  messages: ChatMessageType[] = [],
  messageId: string,
  messageBody: string,
) => {
  return messages.map((message) =>
    message.id === messageId
      ? {
          ...message,
          message: messageBody,
          partyGathering: undefined,
        }
      : message,
  );
};
