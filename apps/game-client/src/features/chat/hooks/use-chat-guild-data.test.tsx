import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MessageType } from "@/api/chat.api";
import { updateChatMessagesCache } from "@/features/chat/chat-query-cache.helpers";
import { upsertChatMessage } from "@/features/chat/chat.helpers";
import type { ChatMessageResponseDtoOutput as ChatMessageType } from "@lootlog/api-client/models/main/chat-message-response-dto-output";
import { useChatGuildData } from "./use-chat-guild-data";

const mocks = vi.hoisted(() => ({
  getChatMessages: vi.fn(),
}));

vi.mock("@lootlog/api-client/react-query/main/chat", () => ({
  chatControllerGetChatMessages: (...arguments_: unknown[]) =>
    mocks.getChatMessages(...arguments_),
  getChatControllerGetChatMessagesQueryKey: ({
    guildId,
  }: {
    guildId: string;
  }) => [`/guilds/${guildId}/chat-messages`] as const,
}));

vi.mock("@/hooks/api/guild-members-summary-query", () => ({
  getGuildMembersSummaryQueryOptions: ({ guildId }: { guildId: string }) => ({
    queryKey: ["guild-members", guildId],
    queryFn: () => Promise.resolve([]),
  }),
}));

vi.mock("@lootlog/api-client/react-query/main/members", () => ({
  getMembersControllerGetMeQueryKey: ({ guildId }: { guildId: string }) => [
    "current-member",
    guildId,
  ],
  membersControllerGetMe: vi.fn(),
}));

vi.mock("@lootlog/api-client/react-query/main/roles", () => ({
  getRolesControllerGetGuildRolesQueryKey: ({
    guildId,
  }: {
    guildId: string;
  }) => ["guild-roles", guildId],
  rolesControllerGetGuildRoles: vi.fn(),
}));

const createMessage = (
  id: string,
  timestamp: string,
  message = id,
): ChatMessageType => ({
  id,
  guildId: "guild-1",
  message,
  senderId: "user-1",
  timestamp,
  type: MessageType.NORMAL,
  characterData: {
    nick: "Hero",
    id: 1,
    acc: 1,
    lvl: 100,
    prof: "w",
    icon: "hero.png",
  },
  canEdit: false,
  canDelete: false,
});

describe("useChatGuildData", () => {
  const queryClients: QueryClient[] = [];

  afterEach(() => {
    for (const queryClient of queryClients) {
      queryClient.clear();
    }
    queryClients.length = 0;
    mocks.getChatMessages.mockReset();
  });

  it("merges a socket message received during the initial history request", async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClients.push(queryClient);
    let resolveRequest: (messages: ChatMessageType[]) => void = () => undefined;
    mocks.getChatMessages.mockReturnValue(
      new Promise<ChatMessageType[]>((resolve) => {
        resolveRequest = resolve;
      }),
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
      expect(mocks.getChatMessages).toHaveBeenCalledTimes(1);
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
    const chatQueryKey = ["/guilds/guild-1/chat-messages"] as const;
    const initialMessage = createMessage(
      "message-1",
      "2026-01-01T10:01:00.000Z",
      "before reconnect",
    );
    queryClient.setQueryData(chatQueryKey, [initialMessage], { updatedAt: 1 });
    let resolveRequest: (messages: ChatMessageType[]) => void = () => undefined;
    mocks.getChatMessages.mockReturnValue(
      new Promise<ChatMessageType[]>((resolve) => {
        resolveRequest = resolve;
      }),
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
      expect(mocks.getChatMessages).toHaveBeenCalledTimes(1);
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
    mocks.getChatMessages.mockImplementation(
      ({ guildId }: { guildId: string }) => {
        if (guildId === "guild-2") {
          return Promise.reject(new Error("guild-2 failed"));
        }

        return Promise.resolve([
          createMessage("message-1", "2026-01-01T10:01:00.000Z"),
        ]);
      },
    );
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
    mocks.getChatMessages.mockRejectedValue(new Error("network"));
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
