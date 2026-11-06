import type { InfiniteData } from "@tanstack/react-query";
import type {
  GlobalChatMessageResponse,
  GlobalChatMessagesResponse,
} from "@lootlog/client/main";
import type { GlobalChatMessage } from "@lootlog/schema/chat";
import { hashString } from "@lootlog/ui/lib/seeded-random";
import {
  CHAT_VISIBLE_MESSAGE_LIMIT,
  withChatDateDividers,
  type ChatDateDividerRow,
} from "@/features/chat/chat.helpers";
import {
  GLOBAL_CHAT_SHARED_CHANNEL,
  type GlobalChatChannel,
} from "@/store/global-chat.store";

export type GlobalChatPages = InfiniteData<GlobalChatMessagesResponse>;

export type GlobalChatRow =
  | ChatDateDividerRow
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

  return capGlobalChatHistory({
    ...data,
    pages: [{ ...newest, messages: [...newest.messages, message] }, ...older],
  });
};

/**
 * Keeps an open window's history to the game chat's message limit as live
 * messages arrive. Whole oldest pages go first, so the oldest kept page's
 * cursor still reads the history before it. A newest page that alone
 * outgrows the limit loses its oldest messages, and with them the cursor:
 * older history comes back once the window is opened again.
 */
const capGlobalChatHistory = (data: GlobalChatPages): GlobalChatPages => {
  let total = data.pages.reduce((sum, page) => sum + page.messages.length, 0);

  if (total <= CHAT_VISIBLE_MESSAGE_LIMIT) return data;
  const pages = [...data.pages];
  const pageParams = [...data.pageParams];

  while (pages.length > 1 && total > CHAT_VISIBLE_MESSAGE_LIMIT) {
    total -= pages.pop()?.messages.length ?? 0;
    pageParams.pop();
  }

  const [newest] = pages;

  if (newest && total > CHAT_VISIBLE_MESSAGE_LIMIT)
    pages[0] = {
      ...newest,
      messages: newest.messages.slice(-CHAT_VISIBLE_MESSAGE_LIMIT),
      nextCursor: null,
    };

  return { pages, pageParams };
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
 * The picked channel while it still exists, otherwise the one every world
 * shares. A world has a channel once any Organization recorded a timer there;
 * until the world list is known, every world is assumed to have one.
 */
export const resolveGlobalChatChannel = (
  selected: GlobalChatChannel | null,
  worlds: ReadonlyArray<string> | undefined,
): GlobalChatChannel =>
  selected !== null && (!worlds || worlds.includes(selected))
    ? selected
    : GLOBAL_CHAT_SHARED_CHANNEL;

/** A stable, readable color for a sender name or world tag on the dark chat. */
export const getGlobalChatColor = (value: string) =>
  `hsl(${hashString(value) % 360} 70% 72%)`;

/** Readable red on the chat's dark rows. */
const GLOBAL_CHAT_ADMIN_COLOR = "#ff6b6b";

/** Admin names are red; everyone else keeps the color of their name. */
export const getGlobalChatSenderColor = ({
  displayName,
  isAdmin,
}: Pick<GlobalChatMessageResponse, "displayName" | "isAdmin">) =>
  isAdmin ? GLOBAL_CHAT_ADMIN_COLOR : getGlobalChatColor(displayName);

/** Oldest first, with a divider before each day's first message. */
export const getGlobalChatRows = (
  data: GlobalChatPages | undefined,
): GlobalChatRow[] => {
  const rows: Extract<GlobalChatRow, { kind: "message" }>[] = [];
  const seen = new Set<string>();

  // Pages run newest first; a refetch can repeat a message across pages.
  for (const page of (data?.pages ?? []).toReversed()) {
    for (const message of page.messages) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      rows.push({ kind: "message", key: message.id, message });
    }
  }

  return withChatDateDividers(rows, (row) => row.message.timestamp);
};
