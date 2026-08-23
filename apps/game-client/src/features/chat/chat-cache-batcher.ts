import type { ChatMessage } from "@/api/chat.api";
import type { QueryClient } from "@tanstack/react-query";
import {
  removeChatMessage,
  updateChatMessage,
  upsertChatMessage,
} from "./chat.helpers";
import { updateChatMessagesCache } from "./chat-query-cache.helpers";

const CHAT_CACHE_FLUSH_TIMEOUT_MS = 50;

type ChatCacheOperation =
  | { kind: "create"; message: ChatMessage }
  | { guildId: string; kind: "delete"; messageId: string }
  | { guildId: string; kind: "update"; message: string; messageId: string }
  | { guildId: string; kind: "clear" };

type QueuedChatCacheOperation = {
  afterFlush?: () => void;
  operation: ChatCacheOperation;
};

const getOperationGuildId = (operation: ChatCacheOperation) => {
  return operation.kind === "create"
    ? operation.message.guildId
    : operation.guildId;
};

const applyChatCacheOperations = (
  messages: ChatMessage[] | undefined,
  operations: ChatCacheOperation[],
) => {
  let nextMessages = messages;

  for (const operation of operations) {
    switch (operation.kind) {
      case "create":
        nextMessages = upsertChatMessage(nextMessages, operation.message);
        break;
      case "update":
        if (nextMessages) {
          nextMessages = updateChatMessage(
            nextMessages,
            operation.messageId,
            operation.message,
          );
        }
        break;
      case "delete":
        if (nextMessages) {
          nextMessages = removeChatMessage(nextMessages, operation.messageId);
        }
        break;
      case "clear":
        nextMessages = [];
        break;
    }
  }

  return nextMessages;
};

export const createChatCacheBatcher = (queryClient: QueryClient) => {
  let frameId: number | null = null;
  let timeoutId: number | null = null;
  let queuedOperations: QueuedChatCacheOperation[] = [];

  const cancelScheduledFlush = () => {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const flush = () => {
    if (queuedOperations.length === 0) {
      cancelScheduledFlush();
      return;
    }

    const acceptedOperations = queuedOperations;
    queuedOperations = [];
    cancelScheduledFlush();
    const operationsByGuildId = new Map<string, ChatCacheOperation[]>();

    for (const { operation } of acceptedOperations) {
      const guildId = getOperationGuildId(operation);
      const guildOperations = operationsByGuildId.get(guildId);
      if (guildOperations) {
        guildOperations.push(operation);
      } else {
        operationsByGuildId.set(guildId, [operation]);
      }
    }

    for (const [guildId, operations] of operationsByGuildId) {
      updateChatMessagesCache({
        guildId,
        queryClient,
        updater: (messages) => applyChatCacheOperations(messages, operations),
      });
    }

    for (const { afterFlush } of acceptedOperations) {
      afterFlush?.();
    }
  };

  const scheduleFlush = () => {
    if (frameId === null) {
      frameId = requestAnimationFrame(flush);
    }
    if (timeoutId === null) {
      timeoutId = window.setTimeout(flush, CHAT_CACHE_FLUSH_TIMEOUT_MS);
    }
  };

  return {
    discardAll() {
      queuedOperations = [];
      cancelScheduledFlush();
    },
    discardOutsideGuilds(guildIds: readonly string[]) {
      const accessibleGuildIds = new Set(guildIds);
      queuedOperations = queuedOperations.filter(({ operation }) =>
        accessibleGuildIds.has(getOperationGuildId(operation)),
      );
      if (queuedOperations.length === 0) {
        cancelScheduledFlush();
      }
    },
    enqueue(operation: ChatCacheOperation, afterFlush?: () => void) {
      queuedOperations.push({ afterFlush, operation });
      scheduleFlush();
    },
    flush,
  };
};
