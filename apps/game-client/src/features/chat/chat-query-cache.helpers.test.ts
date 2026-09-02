import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import {
  type ChatMessageResponseDtoOutput as ChatMessage,
  getChatControllerGetChatMessagesQueryKey,
} from "@lootlog/client/main";

import { upsertChatMessage } from "./chat.helpers";
import { updateChatMessagesCache } from "./chat-query-cache.helpers";

const guildId = "guild-1";
const queryKey = getChatControllerGetChatMessagesQueryKey({ guildId });
const socketMessage = {
  id: "socket-message",
  guildId,
  senderId: "sender-1",
  message: "Socket message",
  timestamp: "2026-07-20T10:00:00.000Z",
  characterData: { nick: "Sender" },
} as ChatMessage;

describe("chat query cache", () => {
  it("keeps an unseen guild history fetchable after a socket update", async () => {
    const queryClient = new QueryClient();
    const serverHistory = [
      { ...socketMessage, id: "history-message", message: "History message" },
    ];
    const fetchHistory = vi.fn().mockResolvedValue(serverHistory);

    updateChatMessagesCache({
      guildId,
      queryClient,
      updater: (messages) => upsertChatMessage(messages, socketMessage),
    });

    const messages = await queryClient.fetchQuery({
      queryKey,
      queryFn: fetchHistory,
      staleTime: 5 * 60 * 1000,
    });

    expect(fetchHistory).toHaveBeenCalledOnce();
    expect(messages).toEqual(serverHistory);
  });

  it("applies socket updates to an already loaded guild history", () => {
    const queryClient = new QueryClient();
    const historyMessage = {
      ...socketMessage,
      id: "history-message",
      message: "History message",
    };
    queryClient.setQueryData(queryKey, [historyMessage]);

    updateChatMessagesCache({
      guildId,
      queryClient,
      updater: (messages) => upsertChatMessage(messages, socketMessage),
    });

    expect(queryClient.getQueryData(queryKey)).toEqual([
      historyMessage,
      socketMessage,
    ]);
  });
});
