import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GatewayEvent } from "@/config/gateway";
import { useChatMessagesListener } from "./use-chat-messages";
import { useGameStore } from "@/store/game.store";

const mocks = vi.hoisted(() => ({
  handlers: new Map<string, (payload: never) => void>(),
  presentNotifications: vi.fn(),
  sessionDiscordId: "current-discord" as string | undefined,
  socketState: {
    connected: true,
    joined: true,
    joinedGuilds: ["guild-1"] as string[],
  },
  queryClient: {
    fetchQuery: vi.fn().mockResolvedValue({
      name: "Current member",
      roles: [],
    }),
    getQueryData: vi.fn((): unknown => []),
    getQueryState: vi.fn(() => ({ data: [], fetchStatus: "idle" })),
    invalidateQueries: vi.fn(),
    prefetchQuery: vi.fn(),
    removeQueries: vi.fn(),
    setQueryData: vi.fn(),
  },
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => mocks.queryClient,
}));

vi.mock("@/contexts/socket-context", () => ({
  useSocket: () => ({
    ...mocks.socketState,
    socket: {
      hasListeners: () => false,
      off: vi.fn(),
      on: (event: string, handler: (payload: never) => void) => {
        mocks.handlers.set(event, handler);
      },
    },
  }),
}));

vi.mock("@/features/notifications/hooks/use-notification-presenter", () => ({
  useNotificationPresenter: () => ({
    presentNotifications: mocks.presentNotifications,
  }),
}));

vi.mock("@/hooks/auth/use-session", () => ({
  useSession: () => ({
    data: mocks.sessionDiscordId
      ? { user: { discordId: mocks.sessionDiscordId } }
      : undefined,
  }),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    hero: { nick: "Current Hero" },
    getWorldName: () => "pandora",
  },
}));

describe("useChatMessagesListener", () => {
  beforeEach(() => {
    mocks.handlers.clear();
    mocks.presentNotifications.mockReset();
    mocks.sessionDiscordId = "current-discord";
    mocks.socketState.connected = true;
    mocks.socketState.joined = true;
    mocks.socketState.joinedGuilds = ["guild-1"];
    mocks.queryClient.fetchQuery.mockClear();
    mocks.queryClient.getQueryData.mockClear();
    mocks.queryClient.getQueryState.mockClear();
    mocks.queryClient.invalidateQueries.mockClear();
    mocks.queryClient.prefetchQuery.mockClear();
    mocks.queryClient.removeQueries.mockClear();
    mocks.queryClient.setQueryData.mockClear();
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "1",
        characterId: "1",
        currentHp: 1,
        icon: "hero.gif",
        level: 300,
        maxHp: 1,
        name: "Current Hero",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 1, name: "Map", visibility: 30 },
      world: "pandora",
    });
  });

  it("refetches active chat histories after the socket reconnects", () => {
    mocks.socketState.connected = false;
    const { rerender } = renderHook(() => useChatMessagesListener());

    expect(mocks.queryClient.invalidateQueries).not.toHaveBeenCalled();

    mocks.socketState.connected = true;
    rerender();

    expect(mocks.queryClient.invalidateQueries).toHaveBeenCalledTimes(1);
    expect(mocks.queryClient.invalidateQueries).toHaveBeenCalledWith({
      predicate: expect.any(Function),
      refetchType: "active",
    });
  });

  it("removes cached chat histories after losing a guild", () => {
    mocks.socketState.joinedGuilds = ["guild-1", "guild-2"];
    const { rerender } = renderHook(() => useChatMessagesListener());
    mocks.queryClient.removeQueries.mockClear();

    mocks.socketState.joinedGuilds = ["guild-1"];
    rerender();

    expect(mocks.queryClient.removeQueries).toHaveBeenCalledTimes(1);
    const queryFilter = mocks.queryClient.removeQueries.mock.calls[0]?.[0] as {
      predicate: (query: { queryKey: readonly unknown[] }) => boolean;
    };
    expect(
      queryFilter.predicate({
        queryKey: ["/guilds/guild-2/chat-messages"],
      }),
    ).toBe(true);
    expect(
      queryFilter.predicate({
        queryKey: ["/guilds/guild-1/chat-messages"],
      }),
    ).toBe(false);
    expect(queryFilter.predicate({ queryKey: ["unrelated"] })).toBe(false);
  });

  it("removes every cached chat history after losing the account", () => {
    const { rerender } = renderHook(() => useChatMessagesListener());
    mocks.queryClient.removeQueries.mockClear();

    mocks.sessionDiscordId = undefined;
    rerender();

    expect(mocks.queryClient.removeQueries).toHaveBeenCalledTimes(1);
    const queryFilter = mocks.queryClient.removeQueries.mock.calls[0]?.[0] as {
      predicate: (query: { queryKey: readonly unknown[] }) => boolean;
    };
    expect(
      queryFilter.predicate({
        queryKey: ["/guilds/guild-1/chat-messages"],
      }),
    ).toBe(true);
    expect(queryFilter.predicate({ queryKey: ["unrelated"] })).toBe(false);
  });

  it("does not prefetch member presentation data while the chat view is hidden", () => {
    mocks.queryClient.getQueryData.mockReturnValue(undefined);
    renderHook(() =>
      useChatMessagesListener({
        prefetchMembers: false,
      }),
    );
    const handler = mocks.handlers.get(GatewayEvent.CHAT_MESSAGE);

    handler?.({
      id: "message-hidden",
      guildId: "guild-1",
      senderId: "sender-discord",
      message: "No mention",
      timestamp: "2026-04-22T10:00:00.000Z",
      characterData: { nick: "Sender" },
    } as never);

    expect(mocks.queryClient.prefetchQuery).not.toHaveBeenCalled();
  });

  it("prefetches missing member presentation data for a visible chat view", () => {
    mocks.queryClient.getQueryData.mockReturnValue(undefined);
    renderHook(() =>
      useChatMessagesListener({
        prefetchMembers: true,
      }),
    );
    const handler = mocks.handlers.get(GatewayEvent.CHAT_MESSAGE);

    handler?.({
      id: "message-visible",
      guildId: "guild-1",
      senderId: "sender-discord",
      message: "No mention",
      timestamp: "2026-04-22T10:00:00.000Z",
      characterData: { nick: "Sender" },
    } as never);

    expect(mocks.queryClient.prefetchQuery).toHaveBeenCalledOnce();
  });

  it("presents a matching chat mention through the notification pipeline", async () => {
    renderHook(() => useChatMessagesListener());
    const handler = mocks.handlers.get(GatewayEvent.CHAT_MESSAGE);

    handler?.({
      id: "message-1",
      guildId: "guild-1",
      senderId: "sender-discord",
      message: "Hej @Current Hero",
      timestamp: "2026-04-22T10:00:00.000Z",
      characterData: { nick: "Sender" },
    } as never);

    await waitFor(() => {
      expect(mocks.presentNotifications).toHaveBeenCalledWith([
        {
          notification: expect.objectContaining({
            type: "chat-mention",
            notificationId: "chat-mention:guild-1:message-1",
            servers: ["guild-1"],
          }),
          playSound: false,
        },
      ]);
    });
  });
});
