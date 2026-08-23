import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  let frameCallbacks: Map<number, FrameRequestCallback>;

  beforeEach(() => {
    frameCallbacks = new Map();
    let nextFrameId = 1;
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        const frameId = nextFrameId;
        nextFrameId += 1;
        frameCallbacks.set(frameId, callback);
        return frameId;
      }),
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((frameId: number) => {
        frameCallbacks.delete(frameId);
      }),
    );
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

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const flushAnimationFrame = () => {
    const callbacks = [...frameCallbacks.values()];
    frameCallbacks.clear();
    for (const callback of callbacks) {
      callback(0);
    }
  };

  const createMessage = (id: string, guildId = "guild-1") => ({
    id,
    guildId,
    senderId: `sender-${id}`,
    message: `Message ${id}`,
    timestamp: "2026-04-22T10:00:00.000Z",
    characterData: { nick: `Sender ${id}` },
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

  it("does not rerender when only the hero coordinates change", () => {
    let renderCount = 0;
    renderHook(() => {
      renderCount += 1;
      useChatMessagesListener();
    });
    const renderCountBeforeMovement = renderCount;
    const game = useGameStore.getState().game;
    if (!game) throw new Error("Expected game fixture");

    act(() => {
      useGameStore.getState().replaceGame({
        ...game,
        hero: { ...game.hero, x: game.hero.x + 1 },
      });
    });

    expect(renderCount).toBe(renderCountBeforeMovement);
  });

  it("publishes a fifteen-message burst to one guild cache once per frame", () => {
    const onRemoteMessage = vi.fn();
    renderHook(() => useChatMessagesListener({ onRemoteMessage }));
    const handler = mocks.handlers.get(GatewayEvent.CHAT_MESSAGE);

    for (let index = 0; index < 15; index += 1) {
      handler?.(createMessage(String(index)) as never);
    }

    expect(mocks.queryClient.setQueryData).not.toHaveBeenCalled();
    expect(onRemoteMessage).not.toHaveBeenCalled();

    act(() => flushAnimationFrame());

    expect(mocks.queryClient.setQueryData).toHaveBeenCalledOnce();
    expect(onRemoteMessage).toHaveBeenCalledTimes(15);
    const updater = mocks.queryClient.setQueryData.mock.calls[0]?.[1] as (
      messages: unknown[] | undefined,
    ) => Array<{ id: string }>;
    expect(updater([]).map((message) => message.id)).toEqual(
      Array.from({ length: 15 }, (_, index) => String(index)),
    );
  });

  it("folds create, update, delete, and clear operations in receive order", () => {
    renderHook(() => useChatMessagesListener());

    mocks.handlers.get(GatewayEvent.CHAT_MESSAGE)?.(
      createMessage("created") as never,
    );
    mocks.handlers.get(GatewayEvent.CHAT_MESSAGE_UPDATE)?.({
      guildId: "guild-1",
      messageId: "created",
      message: "Edited",
    } as never);
    mocks.handlers.get(GatewayEvent.CHAT_MESSAGE_DELETE)?.({
      guildId: "guild-1",
      messageId: "created",
    } as never);
    mocks.handlers.get(GatewayEvent.CHAT_MESSAGES_CLEAR)?.({
      guildId: "guild-1",
    } as never);
    mocks.handlers.get(GatewayEvent.CHAT_MESSAGE)?.(
      createMessage("after-clear") as never,
    );

    act(() => flushAnimationFrame());

    expect(mocks.queryClient.setQueryData).toHaveBeenCalledOnce();
    const updater = mocks.queryClient.setQueryData.mock.calls[0]?.[1] as (
      messages: unknown[] | undefined,
    ) => Array<{ id: string }>;
    expect(updater([createMessage("existing")])).toEqual([
      createMessage("after-clear"),
    ]);
  });

  it("publishes each organization at most once in the same frame", () => {
    renderHook(() => useChatMessagesListener());
    const handler = mocks.handlers.get(GatewayEvent.CHAT_MESSAGE);

    handler?.(createMessage("guild-1-a", "guild-1") as never);
    handler?.(createMessage("guild-2-a", "guild-2") as never);
    handler?.(createMessage("guild-1-b", "guild-1") as never);
    handler?.(createMessage("guild-2-b", "guild-2") as never);

    act(() => flushAnimationFrame());

    expect(mocks.queryClient.setQueryData).toHaveBeenCalledTimes(2);
    expect(
      mocks.queryClient.setQueryData.mock.calls.map((call) => call[0]),
    ).toEqual([
      ["/guilds/guild-1/chat-messages"],
      ["/guilds/guild-2/chat-messages"],
    ]);
  });

  it("flushes through the safety timeout when animation frames are paused", () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "requestAnimationFrame",
      vi.fn((callback: FrameRequestCallback) => {
        frameCallbacks.set(1, callback);
        return 1;
      }),
    );
    vi.stubGlobal(
      "cancelAnimationFrame",
      vi.fn((frameId: number) => {
        frameCallbacks.delete(frameId);
      }),
    );
    const { unmount } = renderHook(() => useChatMessagesListener());
    const handler = mocks.handlers.get(GatewayEvent.CHAT_MESSAGE);
    handler?.(createMessage("background") as never);

    act(() => {
      vi.advanceTimersByTime(49);
    });
    expect(mocks.queryClient.setQueryData).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(mocks.queryClient.setQueryData).toHaveBeenCalledOnce();

    unmount();
    vi.useRealTimers();
  });

  it("flushes accepted operations during ordinary cleanup", () => {
    const { unmount } = renderHook(() => useChatMessagesListener());
    mocks.handlers.get(GatewayEvent.CHAT_MESSAGE)?.(
      createMessage("before-unmount") as never,
    );

    expect(mocks.queryClient.setQueryData).not.toHaveBeenCalled();

    unmount();

    expect(mocks.queryClient.setQueryData).toHaveBeenCalledOnce();
  });

  it("discards pending operations before removing caches on account loss", () => {
    const { rerender } = renderHook(() => useChatMessagesListener());
    mocks.queryClient.removeQueries.mockClear();
    mocks.handlers.get(GatewayEvent.CHAT_MESSAGE)?.(
      createMessage("old-account") as never,
    );

    mocks.sessionDiscordId = undefined;
    rerender();
    act(() => flushAnimationFrame());

    expect(mocks.queryClient.removeQueries).toHaveBeenCalledOnce();
    expect(mocks.queryClient.setQueryData).not.toHaveBeenCalled();
  });

  it("drops pending operations for a guild before removing its cache", () => {
    mocks.socketState.joinedGuilds = ["guild-1", "guild-2"];
    const { rerender } = renderHook(() => useChatMessagesListener());
    const handler = mocks.handlers.get(GatewayEvent.CHAT_MESSAGE);
    handler?.(createMessage("kept", "guild-1") as never);
    handler?.(createMessage("dropped", "guild-2") as never);

    mocks.socketState.joinedGuilds = ["guild-1"];
    rerender();
    act(() => flushAnimationFrame());

    expect(mocks.queryClient.setQueryData).toHaveBeenCalledOnce();
    expect(mocks.queryClient.setQueryData.mock.calls[0]?.[0]).toEqual([
      "/guilds/guild-1/chat-messages",
    ]);
  });

  it("keeps accepted messages across a socket reconnect", () => {
    const { rerender } = renderHook(() => useChatMessagesListener());
    mocks.handlers.get(GatewayEvent.CHAT_MESSAGE)?.(
      createMessage("during-reconnect") as never,
    );

    mocks.socketState.connected = false;
    rerender();
    mocks.socketState.connected = true;
    rerender();
    act(() => flushAnimationFrame());

    expect(mocks.queryClient.setQueryData).toHaveBeenCalledOnce();
    expect(mocks.queryClient.invalidateQueries).toHaveBeenCalledOnce();
  });
});
