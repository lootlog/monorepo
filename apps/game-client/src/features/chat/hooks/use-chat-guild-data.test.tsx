import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createChatMessage } from "../chat-test-fixtures";
import { updateChatMessagesCache } from "@/features/chat/chat-query-cache.helpers";
import { upsertChatMessage } from "@/features/chat/chat.helpers";
import {
  type ChatMessageResponseDtoOutput as ChatMessageType,
  getChatControllerGetChatMessagesQueryKey,
} from "@lootlog/client/main";
import { configureApiClients } from "@lootlog/client/transport";

import { useChatGuildData } from "./use-chat-guild-data";

const historyRequests = vi.fn<(guildId: string) => Promise<Response>>();
let restoreApi: () => void;
beforeEach(() => {
  restoreApi = configureApiClients({
    main: {
      baseUrl: "https://api.example.test",
      fetch: async (input) => {
        const url = new URL(
          input instanceof Request ? input.url : String(input),
        );
        if (url.pathname.endsWith("/chat-messages")) {
          return await historyRequests(url.pathname.split("/")[2] ?? "");
        }
        if (url.pathname.endsWith("/members/summary")) return Response.json([]);
        throw new Error(`Unexpected HTTP request: ${url.pathname}`);
      },
    },
  });
});

const createMessage = (id: string, timestamp: string, message = id) =>
  createChatMessage({ id, timestamp, message, senderId: "user-1" });

describe("useChatGuildData", () => {
  const queryClients: QueryClient[] = [];

  afterEach(() => {
    for (const queryClient of queryClients) {
      queryClient.clear();
    }
    queryClients.length = 0;
    historyRequests.mockReset();
    restoreApi();
  });

  it("merges a socket message received during the initial history request", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClients.push(queryClient);
    let resolveRequest: (messages: ChatMessageType[]) => void = () => undefined;
    historyRequests.mockReturnValue(
      new Promise<ChatMessageType[]>((resolve) => {
        resolveRequest = resolve;
      }).then((messages) => Response.json(messages)),
    );
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () =>
        useChatGuildData({
          currentCharacterNick: "Hero",
          guilds: [{ id: "guild-1", name: "Guild" }],
          selectedGuildId: "guild-1",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(historyRequests).toHaveBeenCalledTimes(1);
    });
    const socketMessage = createMessage(
      "message-2",
      "2026-01-01T10:02:00.000Z",
    );
    act(() => {
      updateChatMessagesCache({
        guildId: "guild-1",
        queryClient,
        updater: (messages) => upsertChatMessage(messages, socketMessage),
      });
      resolveRequest([createMessage("message-1", "2026-01-01T10:01:00.000Z")]);
    });

    await waitFor(() => {
      expect(
        result.current.messagesByGuildId["guild-1"]?.map(
          (message) => message.id,
        ),
      ).toEqual(["message-1", "message-2"]);
    });
  });

  it("merges a reconnect response with a socket message received during refetch", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClients.push(queryClient);
    const chatQueryKey = getChatControllerGetChatMessagesQueryKey({
      guildId: "guild-1",
    });
    const initialMessage = createMessage(
      "message-1",
      "2026-01-01T10:01:00.000Z",
      "before reconnect",
    );
    queryClient.setQueryData(chatQueryKey, [initialMessage], { updatedAt: 1 });
    let resolveRequest: (messages: ChatMessageType[]) => void = () => undefined;
    historyRequests.mockReturnValue(
      new Promise<ChatMessageType[]>((resolve) => {
        resolveRequest = resolve;
      }).then((messages) => Response.json(messages)),
    );

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () =>
        useChatGuildData({
          currentCharacterNick: "Hero",
          guilds: [{ id: "guild-1", name: "Guild" }],
          selectedGuildId: "guild-1",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(historyRequests).toHaveBeenCalledTimes(1);
    });
    const socketUpdate = createMessage(
      "message-1",
      "2026-01-01T10:01:00.000Z",
      "updated over socket",
    );
    const socketMessage = createMessage(
      "message-3",
      "2026-01-01T10:03:00.000Z",
    );
    act(() => {
      queryClient.setQueryData(chatQueryKey, [socketUpdate, socketMessage]);
      resolveRequest([
        createMessage(
          "message-1",
          "2026-01-01T10:01:00.000Z",
          "stale server value",
        ),
        createMessage("message-2", "2026-01-01T10:02:00.000Z"),
      ]);
    });
    await waitFor(() => {
      expect(
        result.current.messagesByGuildId["guild-1"]?.map(
          (message) => message.id,
        ),
      ).toEqual(["message-1", "message-2", "message-3"]);
    });
    expect(result.current.messagesByGuildId["guild-1"]?.[0]?.message).toBe(
      "updated over socket",
    );
  });

  it("keeps successful guild histories when another guild fails", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClients.push(queryClient);
    historyRequests.mockImplementation((guildId) => {
      if (guildId === "guild-2") {
        return Promise.resolve(
          Response.json({ message: "guild-2 failed" }, { status: 503 }),
        );
      }

      return Promise.resolve(
        Response.json([createMessage("message-1", "2026-01-01T10:01:00.000Z")]),
      );
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () =>
        useChatGuildData({
          currentCharacterNick: "Hero",
          guilds: [
            { id: "guild-1", name: "Guild 1" },
            { id: "guild-2", name: "Guild 2" },
          ],
          selectedGuildId: "all",
        }),
      { wrapper },
    );

    await waitFor(() => {
      expect(result.current.failedGuildIds).toEqual(["guild-2"]);
    });

    expect(result.current.error).toBeNull();
    expect(result.current.initialLoading).toBe(false);
    expect(result.current.messagesByGuildId["guild-1"]).toHaveLength(1);
  });

  it("exposes an initial error when no guild history loads", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClients.push(queryClient);
    historyRequests.mockRejectedValue(new Error("network"));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(
      () =>
        useChatGuildData({
          currentCharacterNick: "Hero",
          guilds: [{ id: "guild-1", name: "Guild" }],
          selectedGuildId: "guild-1",
        }),
      { wrapper },
    );

    expect(result.current.initialLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(Error);
    });

    expect(result.current.initialLoading).toBe(false);
    expect(result.current.hasMessagesResponse).toBe(false);
  });
});
