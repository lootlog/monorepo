import type { InfiniteData } from "@tanstack/react-query";
import type {
  GlobalChatMessageResponse,
  GlobalChatMessagesResponse,
} from "@lootlog/client/main";
import type { GlobalChatMessage } from "@lootlog/schema/chat";
import { hashString } from "@lootlog/ui/lib/seeded-random";
import { getChatMessageDayKey } from "@/features/chat/chat.helpers";
import {
  GLOBAL_CHAT_SHARED_CHANNEL,
  type GlobalChatChannel,
} from "@/store/global-chat.store";

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

/** A message the gateway delivered, which never knows whose it is. */
export const fromDeliveredGlobalChatMessage = (
  message: GlobalChatMessage,
): GlobalChatMessageResponse => ({
  ...message,
  isAdmin: message.isAdmin ?? false,
  isOwn: false,
});

/** Drops a message an admin deleted from every loaded page. */
export const removeGlobalChatMessage = (
  data: GlobalChatPages | undefined,
  id: string,
): GlobalChatPages | undefined =>
  data && {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      messages: page.messages.filter((message) => message.id !== id),
    })),
  };

/**
 * Replaces the pinned message, which the newest page carries. A message the
 * caller sent keeps its `isOwn` from the loaded history.
 */
export const setGlobalChatPinned = (
  data: GlobalChatPages | undefined,
  pinned: GlobalChatMessage | null,
): GlobalChatPages | undefined => {
  const [newest, ...older] = data?.pages ?? [];

  if (!data || !newest) return data;

  const loaded = pinned
    ? [newest.pinned, ...data.pages.flatMap((page) => page.messages)].find(
        (message) => message?.id === pinned.id,
      )
    : undefined;

  return {
    ...data,
    pages: [
      {
        ...newest,
        pinned: pinned && (loaded ?? fromDeliveredGlobalChatMessage(pinned)),
      },
      ...older,
    ],
  };
};

/**
 * The picked channel while it still exists, otherwise the current world's,
 * otherwise the one every world shares. A world has a channel once any
 * Organization recorded a timer there; until the world list is known, every
 * world is assumed to have one.
 */
export const resolveGlobalChatChannel = (
  selected: GlobalChatChannel | null,
  currentWorld: string | undefined,
  worlds: ReadonlyArray<string> | undefined,
): GlobalChatChannel => {
  const exists = (world: string) => !worlds || worlds.includes(world);

  if (
    selected !== null &&
    (selected === GLOBAL_CHAT_SHARED_CHANNEL || exists(selected))
  )
    return selected;

  if (currentWorld !== undefined && exists(currentWorld)) return currentWorld;

  return GLOBAL_CHAT_SHARED_CHANNEL;
};

/** A stable, readable color for a sender name or world tag on the dark chat. */
export const getGlobalChatColor = (value: string) =>
  `hsl(${hashString(value) % 360} 70% 72%)`;

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
