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

export const fromDeliveredGlobalChatMessage = (
  message: GlobalChatMessage,
): GlobalChatMessageResponse => ({
  ...message,
  isAdmin: message.isAdmin ?? false,
  isOwn: false,
});

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

export const resolveGlobalChatChannel = (
  selected: GlobalChatChannel | null,
  worlds: ReadonlyArray<string> | undefined,
): GlobalChatChannel =>
  selected !== null && (!worlds || worlds.includes(selected))
    ? selected
    : GLOBAL_CHAT_SHARED_CHANNEL;

export const getGlobalChatColor = (value: string) =>
  `hsl(${hashString(value) % 360} 70% 72%)`;

const GLOBAL_CHAT_ADMIN_COLOR = "#ff6b6b";

export const getGlobalChatSenderColor = ({
  displayName,
  isAdmin,
}: Pick<GlobalChatMessageResponse, "displayName" | "isAdmin">) =>
  isAdmin ? GLOBAL_CHAT_ADMIN_COLOR : getGlobalChatColor(displayName);

export const getGlobalChatRows = (
  data: GlobalChatPages | undefined,
): GlobalChatRow[] => {
  const rows: Extract<GlobalChatRow, { kind: "message" }>[] = [];
  const seen = new Set<string>();

  for (const page of (data?.pages ?? []).toReversed()) {
    for (const message of page.messages) {
      if (seen.has(message.id)) continue;
      seen.add(message.id);
      rows.push({ kind: "message", key: message.id, message });
    }
  }

  return withChatDateDividers(rows, (row) => row.message.timestamp);
};
