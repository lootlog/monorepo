import type { InfiniteData } from "@tanstack/react-query";
import type {
  GlobalChatMessageResponse,
  GlobalChatMessagesResponse,
} from "@lootlog/client/main";
import { getChatMessageDayKey } from "@/features/chat/chat.helpers";

export type GlobalChatPages = InfiniteData<GlobalChatMessagesResponse>;

export type GlobalChatRow =
  | { kind: "date-divider"; key: string; timestamp: string }
  | { kind: "message"; key: string; message: GlobalChatMessageResponse };

/**
 * Adds a sent or delivered message to the newest page. The gateway also
 * delivers the sender's own message, before or after the send response, so a
 * known id stays in place and only gains the response's `isOwn`.
 */
export const appendGlobalChatMessage = (
  data: GlobalChatPages | undefined,
  message: GlobalChatMessageResponse,
): GlobalChatPages | undefined => {
  const [newest, ...older] = data?.pages ?? [];

  if (!data || !newest) return data;

  const known = data.pages.some((page) =>
    page.messages.some((existing) => existing.id === message.id),
  );

  if (known) {
    if (!message.isOwn) return data;

    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        messages: page.messages.map((existing) =>
          existing.id === message.id ? { ...existing, isOwn: true } : existing,
        ),
      })),
    };
  }

  return {
    ...data,
    pages: [{ ...newest, messages: [...newest.messages, message] }, ...older],
  };
};

/** Oldest first, with a divider before each day's first message. */
export const getGlobalChatRows = (
  data: GlobalChatPages | undefined,
): GlobalChatRow[] => {
  const rows: GlobalChatRow[] = [];
  const seen = new Set<string>();
  let previousDayKey: string | null = null;

  // Pages run newest first; a refetch can repeat a message across pages.
  for (const page of [...(data?.pages ?? [])].reverse()) {
    for (const message of page.messages) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      const dayKey = getChatMessageDayKey(message.timestamp);

      if (dayKey !== previousDayKey) {
        rows.push({
          kind: "date-divider",
          key: `date-divider:${dayKey}`,
          timestamp: message.timestamp,
        });
        previousDayKey = dayKey;
      }

      rows.push({ kind: "message", key: message.id, message });
    }
  }

  return rows;
};
