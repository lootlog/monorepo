import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@/lib/api/generated/main/model";
import type { ChatFilter } from "@/store/chat.store";
import { MessageType } from "@/api/chat.api";

const CHAT_MESSAGE_DEDUPE_WINDOW_MS = 200;
const CHAT_NPC_GROUP_WINDOW_MS = 60_000;
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
      additionalSenderCount: number;
      count: number;
      message: ChatMessageType;
    };

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
    const timestamp = getChatMessageTimestamp(message.timestamp);
    const dedupeKey = getChatMessageDedupeKey(message);

    const duplicate = unique.find(
      (existingMessage) =>
        getChatMessageDedupeKey(existingMessage) === dedupeKey &&
        Math.abs(
          getChatMessageTimestamp(existingMessage.timestamp) - timestamp,
        ) <= CHAT_MESSAGE_DEDUPE_WINDOW_MS,
    );

    if (!duplicate) {
      unique.push(message);
    }
  }

  return unique.sort(
    (firstMessage, secondMessage) =>
      getChatMessageTimestamp(firstMessage.timestamp) -
      getChatMessageTimestamp(secondMessage.timestamp),
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
      senderIds: Set<string>;
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
        additionalSenderCount: 0,
        kind: "npc-group",
        key: `npc-group:${message.id}`,
        count: 1,
        message,
        firstTimestamp: timestamp,
        order: renderables.length,
        senderIds: new Set([message.senderId]),
        sortTimestamp: timestamp,
      };

      activeNpcGroups.set(groupKey, nextGroup);
      renderables.push(nextGroup);
      continue;
    }

    existingGroup.count += 1;
    existingGroup.message = message;
    existingGroup.senderIds.add(message.senderId);
    existingGroup.sortTimestamp = timestamp;
  }

  const groupedRenderables: Array<
    Exclude<ChatRenderableMessage, { kind: "date-divider" }>
  > = (Array.isArray(renderables) ? renderables : [])
    .toSorted((firstRenderable, secondRenderable) => {
      if (firstRenderable.sortTimestamp !== secondRenderable.sortTimestamp) {
        return firstRenderable.sortTimestamp - secondRenderable.sortTimestamp;
      }

      return firstRenderable.order - secondRenderable.order;
    })
    .map((renderable) => {
      if (renderable.kind === "message") {
        return {
          kind: "message" as const,
          key: renderable.key,
          message: renderable.message,
        };
      }

      return {
        additionalSenderCount: Math.max(renderable.senderIds.size - 1, 0),
        kind: "npc-group" as const,
        key: renderable.key,
        count: renderable.count,
        message: renderable.message,
      };
    });

  const normalizedRenderables: ChatRenderableMessage[] =
    groupedRenderables.flatMap((renderable, index) => {
      const previousRenderable = groupedRenderables[index - 1];
      const previousTimestamp = previousRenderable
        ? previousRenderable.message.timestamp
        : null;
      const currentTimestamp = renderable.message.timestamp;
      const startsNewDay =
        !previousTimestamp ||
        getChatMessageDayKey(previousTimestamp) !==
          getChatMessageDayKey(currentTimestamp);

      if (!startsNewDay) {
        return renderable;
      }

      return [
        {
          kind: "date-divider" as const,
          key: `date-divider:${getChatMessageDayKey(currentTimestamp)}`,
          timestamp: currentTimestamp,
        },
        renderable,
      ];
    });

  return normalizedRenderables;
};

export const getChatRenderableMessagesSignature = (
  renderables: ChatRenderableMessage[],
) => {
  return renderables
    .map((renderable) => {
      if (renderable.kind === "date-divider") {
        return `${renderable.key}:${renderable.timestamp}`;
      }

      if (renderable.kind === "npc-group") {
        return `${renderable.key}:${renderable.message.id}:${renderable.count}`;
      }

      return `${renderable.key}:${renderable.message.id}`;
    })
    .join("|");
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
