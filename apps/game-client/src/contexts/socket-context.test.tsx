import { queryClient } from "@/lib/query-client";
import { act, render, waitFor } from "@testing-library/react";
import { GatewayEvent } from "@/config/gateway";
import { useGameStore } from "@/store/game.store";
import { useGlobalStore } from "@/store/global.store";
import { SocketProvider } from "./socket-context";

const { mockSocket, mockSocketHandlers } = vi.hoisted(() => {
  const socketHandlers = {} as Record<string, (data: unknown) => void>;

  return {
    mockSocketHandlers: socketHandlers,
    mockSocket: {
      auth: {},
      connected: true,
      id: "socket-1",
      connect: vi.fn(),
      disconnect: vi.fn(),
      emit: vi.fn(),
      join: vi.fn().mockResolvedValue({
        connectionId: "connection-1",
        organizationIds: ["guild-1"],
      }),
      off: vi.fn((event: string) => {
        delete socketHandlers[event];
      }),
      offAny: vi.fn(),
      on: vi.fn((event: string, handler: (data: unknown) => void) => {
        socketHandlers[event] = handler;
      }),
      onAny: vi.fn(),
    },
  };
});

vi.mock("@/lib/socket", () => ({
  getSocket: () => mockSocket,
}));

const expectedJoinData = {
  accountId: "20",
  characterId: "10",
  clan: {
    id: 30,
    name: "Lootlog",
    rank: 4,
  },
  icon: "hero-icon",
  lvl: 100,
  name: "Hero",
  prof: "w",
  world: "alpha",
};

describe("SocketProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    mockSocket.auth = {};
    mockSocket.connected = true;
    mockSocket.id = "socket-1";
    for (const eventName of Object.keys(mockSocketHandlers)) {
      delete mockSocketHandlers[eventName];
    }
    useGlobalStore.setState({
      gameState: { gameInitialized: true },
      socketState: { connected: false, joined: false, joinedGuilds: [] },
    });
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "20",
        characterId: "10",
        clan: {
          id: 30,
          name: "Lootlog",
          rank: 4,
        },
        currentHp: 100,
        icon: "hero-icon",
        level: 100,
        maxHp: 100,
        name: "Hero",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: {
        id: 100,
        name: "Karka-han",
        visibility: 0,
      },
      world: "alpha",
    });
  });

  it("joins through the realtime client after the game is ready", async () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );

    await waitFor(() => {
      expect(mockSocket.join).toHaveBeenCalledWith(expectedJoinData);
    });
  });

  it("does not include precise location in the session join command", async () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );

    await waitFor(() => {
      expect(mockSocket.join).toHaveBeenCalledWith(expectedJoinData);
      expect(mockSocket.join.mock.calls[0]?.[0]).not.toHaveProperty("location");
    });
  });

  it("synchronizes joined guilds when permissions are updated", async () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );

    act(() => {
      mockSocketHandlers[GatewayEvent.PERMISSIONS_UPDATED]?.({
        guilds: [{ guild: { id: "guild-1" } }, { guild: { id: "guild-2" } }],
        featureRooms: ["timers:base"],
      });
    });

    await waitFor(() => {
      expect(useGlobalStore.getState().socketState.joinedGuilds).toEqual([
        "guild-1",
        "guild-2",
      ]);
    });
  });

  it("clears joined guilds when permissions update payload has no guilds", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);

    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );

    act(() => {
      mockSocketHandlers[GatewayEvent.JOIN]?.({
        status: "success",
        guildIds: ["guild-1"],
      });
    });

    await waitFor(() => {
      expect(useGlobalStore.getState().socketState).toMatchObject({
        joined: true,
        joinedGuilds: ["guild-1"],
      });
    });

    act(() => {
      mockSocketHandlers[GatewayEvent.PERMISSIONS_UPDATED]?.({
        featureRooms: ["timers:base"],
      });
    });

    await waitFor(() => {
      expect(useGlobalStore.getState().socketState).toMatchObject({
        joined: false,
        joinedGuilds: [],
      });
    });
  });

  it("drops old timers on reconnect even without a permissions update", () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );
    act(() =>
      mockSocketHandlers[GatewayEvent.JOIN]?.({
        status: "success",
        guildIds: ["guild-1"],
      }),
    );
    queryClient.setQueryData(["/timers", { world: "alpha" }], ["hidden titan"]);
    act(() => {
      mockSocketHandlers[GatewayEvent.DISCONNECT]?.(undefined);
      mockSocketHandlers[GatewayEvent.CONNECT]?.(undefined);
      mockSocketHandlers[GatewayEvent.JOIN]?.({
        status: "success",
        guildIds: ["guild-1"],
      });
    });
    expect(
      queryClient.getQueryData(["/timers", { world: "alpha" }]),
    ).toBeUndefined();
  });

  it("drops timers and chat even when membership stays the same", () => {
    queryClient.setQueryData(
      ["/timers", { world: "alpha" }],
      [{ npc: { lvl: 105 } }],
    );
    queryClient.setQueryData(
      ["/guilds/guild-1/chat-messages"],
      ["hidden titan"],
    );
    queryClient.setQueryData(["/timer-settings"], { sound: true });
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );
    act(() => {
      mockSocketHandlers[GatewayEvent.PERMISSIONS_UPDATED]?.({
        guilds: [{ guild: { id: "guild-1" } }],
        featureRooms: ["timers:base"],
      });
    });
    expect(
      queryClient.getQueryData(["/timers", { world: "alpha" }]),
    ).toBeUndefined();
    expect(
      queryClient.getQueryData(["/guilds/guild-1/chat-messages"]),
    ).toBeUndefined();
    expect(queryClient.getQueryData(["/timer-settings"])).toEqual({
      sound: true,
    });
  });

  it("clears joined state after disconnect", async () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );

    act(() => {
      mockSocketHandlers[GatewayEvent.JOIN]?.({
        status: "success",
        guildIds: ["guild-1"],
      });
    });

    await waitFor(() => {
      expect(useGlobalStore.getState().socketState).toMatchObject({
        connected: true,
        joined: true,
        joinedGuilds: ["guild-1"],
      });
    });

    act(() => {
      mockSocketHandlers[GatewayEvent.DISCONNECT]?.(undefined);
    });

    await waitFor(() => {
      expect(useGlobalStore.getState().socketState).toEqual({
        connected: false,
        joined: false,
        joinedGuilds: [],
      });
    });
  });

  it("does not register a development catch-all listener", () => {
    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );

    expect(mockSocket.onAny).not.toHaveBeenCalled();
  });
});
