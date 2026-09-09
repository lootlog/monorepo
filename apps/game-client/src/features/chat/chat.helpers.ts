import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/client/main";
import { CHAT_MESSAGE_LIMIT } from "@lootlog/schema/chat";
import type { ChatFilter } from "@/store/chat.store";
import { MessageType } from "@/api/chat.api";

const CHAT_MESSAGE_DEDUPE_WINDOW_MS = 200;
const CHAT_NPC_GROUP_WINDOW_MS = 60_000;
export const CHAT_VISIBLE_MESSAGE_LIMIT = 500;
const getChatMessageDayKey = (timestamp: string) => timestamp.slice(0, 10);
const getChatMessageTimestamp = (timestamp: string) =>
  new Date(timestamp).getTime();
const getChatMessageDedupeKey = (message: ChatMessageType) => {
  return `${message.message?.trim() ?? ""}_${message.senderId}_${message.npc?.id ?? ""}`;
};

export type ChatRenderableMessage =
  | {
      kind: "date-divider";
      key: string;
      timestamp: string;
    }
  | {
      kind: "message";
      key: string;
      message: ChatMessageType;
    }
  | {
      kind: "npc-group";
      key: string;
      count: number;
      messageIds: string[];
      message: ChatMessageType;
    };

export const getNextSelectedGuildId = (
  selectedGuildId: string | undefined,
  guilds?: { id: string }[],
) => {
  if (!guilds) {
    return undefined;
  }

  if (guilds.length === 0) {
    return selectedGuildId ? "" : undefined;
  }

  if (
    selectedGuildId === "all" ||
    guilds.some((guild) => guild.id === selectedGuildId)
  ) {
    return undefined;
  }

  return guilds[0].id;
};

export const getMessagesForSelectedGuild = (
  messageCache: Record<string, ChatMessageType[]>,
  selectedGuildId?: string,
) => {
  const messages: ChatMessageType[] = [];

  if (selectedGuildId === "all") {
    for (const guildMessages of Object.values(messageCache)) {
      for (const message of guildMessages) {
        if (message.timestamp) {
          messages.push(message);
        }
      }
    }

    return messages;
  }

  for (const message of messageCache[selectedGuildId ?? ""] ?? []) {
    if (message.timestamp) {
      messages.push(message);
    }
  }

  return messages;
};

export type ChatMessageGroup = {
  message: ChatMessageType;
  messageIds: string[];
};

export const groupDuplicateChatMessages = (messages: ChatMessageType[]) => {
  const unique: ChatMessageGroup[] = [];
  const groupsByDedupeKeyAndBucket = new Map<
    string,
    Map<number, { timestamp: number; group: ChatMessageGroup }[]>
  >();

  for (const message of messages) {
    const timestamp = getChatMessageTimestamp(message.timestamp);
    const dedupeKey = getChatMessageDedupeKey(message);
    const bucket = Math.floor(timestamp / CHAT_MESSAGE_DEDUPE_WINDOW_MS);
    let duplicate: ChatMessageGroup | undefined;
    let groupsByBucket = groupsByDedupeKeyAndBucket.get(dedupeKey);
    if (!groupsByBucket) {
      groupsByBucket = new Map();
      groupsByDedupeKeyAndBucket.set(dedupeKey, groupsByBucket);
    }
    for (
      let comparedBucket = bucket - 1;
      comparedBucket <= bucket + 1;
      comparedBucket += 1
    ) {
      const comparedGroups = groupsByBucket.get(comparedBucket);
      if (!comparedGroups) continue;
      for (const candidate of comparedGroups) {
        if (
          Math.abs(candidate.timestamp - timestamp) <=
          CHAT_MESSAGE_DEDUPE_WINDOW_MS
        ) {
          duplicate = candidate.group;
          break;
        }
      }
      if (duplicate) break;
    }
    if (duplicate) {
      duplicate.messageIds.push(message.id);
      continue;
    }
    const group = { message, messageIds: [message.id] };
    const bucketGroups = groupsByBucket.get(bucket) ?? [];
    bucketGroups.push({ timestamp, group });
    groupsByBucket.set(bucket, bucketGroups);
    unique.push(group);
  }
  return unique.sort(
    (first, second) =>
      getChatMessageTimestamp(first.message.timestamp) -
      getChatMessageTimestamp(second.message.timestamp),
  );
};

export const deduplicateChatMessages = (messages: ChatMessageType[]) =>
  groupDuplicateChatMessages(messages).map((group) => group.message);

export const getVisibleChatMessageAliases = (
  groups: ChatMessageGroup[],
  visibleIds: readonly string[],
) => {
  const visible = new Set(visibleIds);
  return groups.flatMap((group) =>
    visible.has(group.message.id) ? group.messageIds : [],
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
      case "reports":
        return (
          message.type === MessageType.NPC ||
          message.type === MessageType.PARTY_GATHERING
        );
      default:
        return true;
    }
  });
};

const getChatNpcGroupKey = (message: ChatMessageType) => {
  const npc = message.npc;

  if (!npc) {
    return "";
  }

  return [
    getChatMessageDayKey(message.timestamp),
    message.guildId,
    npc.id,
    npc.name,
    npc.location,
    npc.lvl,
    npc.prof,
    npc.wt,
    npc.type,
    npc.icon,
    npc.hpp ?? "",
    npc.x ?? "",
    npc.y ?? "",
  ].join(":");
};

type InternalRenderableMessage =
  | (Extract<ChatRenderableMessage, { kind: "message" }> & {
      order: number;
      sortTimestamp: number;
    })
  | (Extract<ChatRenderableMessage, { kind: "npc-group" }> & {
      firstTimestamp: number;
      order: number;
      sortTimestamp: number;
    });

export const getChatRenderableMessages = (
  messages: ChatMessageType[],
): ChatRenderableMessage[] => {
  const renderables: InternalRenderableMessage[] = [];
  const activeNpcGroups = new Map<
    string,
    Extract<InternalRenderableMessage, { kind: "npc-group" }>
  >();

  for (const message of messages) {
    const timestamp = getChatMessageTimestamp(message.timestamp);

    if (message.type !== MessageType.NPC || !message.npc) {
      renderables.push({
        kind: "message",
        key: message.id,
        message,
        order: renderables.length,
        sortTimestamp: timestamp,
      });
      continue;
    }

    const groupKey = getChatNpcGroupKey(message);
    const existingGroup = activeNpcGroups.get(groupKey);

    if (
      !existingGroup ||
      timestamp - existingGroup.firstTimestamp > CHAT_NPC_GROUP_WINDOW_MS
    ) {
      const nextGroup: Extract<
        InternalRenderableMessage,
        { kind: "npc-group" }
      > = {
        kind: "npc-group",
        key: `npc-group:${message.id}`,
        count: 1,
        messageIds: [message.id],
        message,
        firstTimestamp: timestamp,
        order: renderables.length,
        sortTimestamp: timestamp,
      };

      activeNpcGroups.set(groupKey, nextGroup);
      renderables.push(nextGroup);
      continue;
    }

    existingGroup.count += 1;
    existingGroup.messageIds.push(message.id);
  }

  renderables.sort((firstRenderable, secondRenderable) => {
    if (firstRenderable.sortTimestamp !== secondRenderable.sortTimestamp) {
      return firstRenderable.sortTimestamp - secondRenderable.sortTimestamp;
    }

    return firstRenderable.order - secondRenderable.order;
  });

  const normalizedRenderables: ChatRenderableMessage[] = [];
  let previousDayKey: string | null = null;

  for (const renderable of renderables) {
    const publicRenderable: Exclude<
      ChatRenderableMessage,
      { kind: "date-divider" }
    > =
      renderable.kind === "message"
        ? {
            kind: "message",
            key: renderable.key,
            message: renderable.message,
          }
        : {
            kind: "npc-group",
            key: renderable.key,
            count: renderable.count,
            messageIds: renderable.messageIds,
            message: renderable.message,
          };
    const currentTimestamp = publicRenderable.message.timestamp;
    const currentDayKey = getChatMessageDayKey(currentTimestamp);

    if (previousDayKey !== currentDayKey) {
      normalizedRenderables.push({
        kind: "date-divider",
        key: `date-divider:${currentDayKey}`,
        timestamp: currentTimestamp,
      });
      previousDayKey = currentDayKey;
    }

    normalizedRenderables.push(publicRenderable);
  }

  return normalizedRenderables;
};

export const getCurrentChatMessages = (
  messageCache: Record<string, ChatMessageType[]>,
  selectedGuildId: string | undefined,
  chatFilter: ChatFilter,
) => {
  const filteredMessages = filterChatMessages(
    deduplicateChatMessages(
      getMessagesForSelectedGuild(messageCache, selectedGuildId),
    ),
    chatFilter,
  );

  return filteredMessages.slice(-CHAT_VISIBLE_MESSAGE_LIMIT);
};

export const mergeChatMessageHistories = (
  cachedMessages: ChatMessageType[] = [],
  serverMessages: ChatMessageType[] = [],
) => {
  const messagesById = new Map<
    string,
    { message: ChatMessageType; insertionOrder: number }
  >();
  let nextInsertionOrder = 0;

  for (const message of cachedMessages) {
    messagesById.set(message.id, {
      message,
      insertionOrder: nextInsertionOrder,
    });
    nextInsertionOrder += 1;
  }

  for (const message of serverMessages) {
    const cachedMessage = messagesById.get(message.id);
    messagesById.set(message.id, {
      message,
      insertionOrder: cachedMessage?.insertionOrder ?? nextInsertionOrder,
    });

    if (!cachedMessage) {
      nextInsertionOrder += 1;
    }
  }

  return [...messagesById.values()]
    .sort((firstEntry, secondEntry) => {
      const timestampDifference =
        getChatMessageTimestamp(firstEntry.message.timestamp) -
        getChatMessageTimestamp(secondEntry.message.timestamp);

      if (Number.isFinite(timestampDifference) && timestampDifference !== 0) {
        return timestampDifference;
      }

      return firstEntry.insertionOrder - secondEntry.insertionOrder;
    })
    .slice(-CHAT_MESSAGE_LIMIT)
    .map((entry) => entry.message);
};

export const upsertChatMessage = (
  messages: ChatMessageType[] = [],
  nextMessage: ChatMessageType,
) => {
  const existingMessageIndex = messages.findIndex(
    (message) => message.id === nextMessage.id,
  );

  const updatedMessages =
    existingMessageIndex === -1
      ? [...messages, nextMessage]
      : messages.map((message) =>
          message.id === nextMessage.id ? nextMessage : message,
        );

  return updatedMessages.slice(-CHAT_MESSAGE_LIMIT);
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
