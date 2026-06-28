import { act, render, waitFor } from "@testing-library/react";
import { GatewayEvent } from "@/config/gateway";
import { useGlobalStore } from "@/store/global.store";
import { SocketProvider } from "./socket-context";

const { mockRequestMargonemAccountProof, mockSocket, mockSocketHandlers } =
  vi.hoisted(() => {
    const socketHandlers = {} as Record<string, (data: unknown) => void>;

    return {
      mockRequestMargonemAccountProof: vi.fn(),
      mockSocketHandlers: socketHandlers,
      mockSocket: {
        auth: {},
        connected: true,
        id: "socket-1",
        connect: vi.fn(),
        disconnect: vi.fn(),
        emit: vi.fn(),
        off: vi.fn((event: string) => {
          delete socketHandlers[event];
        }),
        on: vi.fn((event: string, handler: (data: unknown) => void) => {
          socketHandlers[event] = handler;
        }),
        onAny: vi.fn(),
      },
    };
  });

vi.mock("@/lib/margonem-account-proof", () => ({
  requestMargonemAccountProof: mockRequestMargonemAccountProof,
}));

vi.mock("@/lib/socket", () => ({
  getSocket: () => mockSocket,
}));

vi.mock("@/lib/game", () => ({
  Game: {
    getWorldName: () => "alpha",
    hero: {
      account: 20,
      clan: undefined,
      id: 10,
      img: "hero-icon",
      lvl: 100,
      nick: "Hero",
      prof: "w",
      x: 1,
      y: 2,
    },
    map: {
      id: 100,
      name: "Karka-han",
    },
  },
}));

const expectedJoinData = {
  accountId: "20",
  characterId: "10",
  clan: undefined,
  icon: "hero-icon",
  location: {
    map: "Karka-han",
    x: 1,
    y: 2,
  },
  lvl: 100,
  name: "Hero",
  prof: "w",
  world: "alpha",
};

describe("SocketProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
  });

  it("emits join with Margonem account proof when proof request succeeds", async () => {
    const proof = {
      userId: "20",
      characterId: "10",
      token: "token",
      ts: 1_700_000_000,
      validatedString: "20+token+1700000000",
      signatureBase64: "signature",
    };
    mockRequestMargonemAccountProof.mockResolvedValue(proof);

    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith(GatewayEvent.JOIN, {
        data: expectedJoinData,
        margonemAccountProof: proof,
      });
    });
    expect(mockRequestMargonemAccountProof).toHaveBeenCalledWith({
      socketId: "socket-1",
      accountId: "20",
      characterId: "10",
      clanId: undefined,
    });
  });

  it("emits join without Margonem account proof when proof request fails", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockRequestMargonemAccountProof.mockRejectedValue(
      new Error("Margonem unavailable"),
    );

    render(
      <SocketProvider>
        <div />
      </SocketProvider>,
    );

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith(GatewayEvent.JOIN, {
        data: expectedJoinData,
      });
    });
  });

  it("clears joined guilds when permissions update payload has no guilds", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);

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
      mockSocketHandlers[GatewayEvent.PERMISSIONS_UPDATED]?.({});
    });

    await waitFor(() => {
      expect(useGlobalStore.getState().socketState).toMatchObject({
        joined: false,
        joinedGuilds: [],
      });
    });
  });
});
