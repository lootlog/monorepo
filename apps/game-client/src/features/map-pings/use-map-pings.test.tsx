import { act, renderHook } from "@testing-library/react";
import type { MapPingAck, MapPingEvent } from "@lootlog/types";
import { GatewayEvent } from "@/config/gateway";
import { useMapPings } from "./use-map-pings";

const testState = vi.hoisted(() => ({
  connected: true,
  joined: true,
  pingsEnabled: true,
}));
const socketHandlers = vi.hoisted(
  () => new Map<string, (payload: MapPingEvent) => void>(),
);
const socket = vi.hoisted(() => ({
  emit: vi.fn(),
  off: vi.fn(),
  on: vi.fn(),
  timeout: vi.fn(),
}));
const controller = vi.hoisted(() => ({
  addOptimistic: vi.fn(() => "local-ping-1"),
  addRemote: vi.fn(() => true),
  clear: vi.fn(),
  isTileValid: vi.fn(() => true),
  register: vi.fn(() => true),
  remove: vi.fn(),
  resolveTile: vi.fn(() => ({ x: 12, y: 8 })),
  unregister: vi.fn(),
}));
const playSound = vi.hoisted(() => vi.fn());

vi.mock("@/contexts/socket-context", () => ({
  useSocket: () => ({
    socket,
    connected: testState.connected,
    joined: testState.joined,
  }),
}));

vi.mock("@/hooks/use-current-game-account-preferences", () => ({
  useCurrentGameAccountPreferences: () => ({
    data: { pings: { enabled: testState.pingsEnabled } },
  }),
}));

vi.mock("@/lib/game", () => ({
  Game: {
    getAccountId: () => "account-1",
    getWorldName: () => "aether",
    hero: { nick: "Sender" },
    map: { id: 42 },
  },
}));

vi.mock("@/lib/sound-playback", () => ({ playSound }));

vi.mock("@/lib/query-client", () => ({
  queryClient: {
    getQueryData: () => ({ pings: { enabled: testState.pingsEnabled } }),
  },
}));

vi.mock("@/store/global.store", () => ({
  useGlobalStore: (
    selector: (state: { gameState: { gameInitialized: boolean } }) => unknown,
  ) => selector({ gameState: { gameInitialized: true } }),
}));

vi.mock("./map-ping-controller", () => ({
  isMapPingSurface: (target: EventTarget | null) =>
    target instanceof HTMLCanvasElement && target.id === "GAME_CANVAS",
  mapPingController: controller,
}));

const createMapMouseEvent = () => {
  const canvas = document.createElement("canvas");
  canvas.id = "GAME_CANVAS";
  const event = new MouseEvent("mousedown", { button: 1 });
  canvas.dispatchEvent(event);
  return event;
};

const createOutsideMouseEvent = () => {
  const element = document.createElement("div");
  const event = new MouseEvent("mousedown", { button: 1 });
  element.dispatchEvent(event);
  return event;
};

describe("useMapPings", () => {
  beforeEach(() => {
    testState.connected = true;
    testState.joined = true;
    testState.pingsEnabled = true;
    socketHandlers.clear();
    vi.clearAllMocks();
    socket.timeout.mockReturnValue(socket);
    socket.on.mockImplementation((event, handler) => {
      socketHandlers.set(event, handler);
    });
    controller.addRemote.mockReturnValue(true);
    controller.register.mockReturnValue(true);
    controller.resolveTile.mockReturnValue({ x: 12, y: 8 });
  });

  it("plays one sound immediately when a local ping is triggered", () => {
    const { result } = renderHook(() => useMapPings());

    act(() => {
      expect(result.current(createMapMouseEvent())).toBe(true);
    });

    expect(controller.addOptimistic).toHaveBeenCalledWith(
      { x: 12, y: 8 },
      42,
      "Sender",
    );
    expect(playSound).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledWith("pings", "mapPing");
    expect(socket.emit).toHaveBeenCalledWith(
      GatewayEvent.MAP_PING_SEND,
      { expectedMapId: 42, x: 12, y: 8 },
      expect.any(Function),
    );
  });

  it("uses the latest cached preference for a local ping trigger", () => {
    testState.pingsEnabled = false;
    const { result } = renderHook(() => useMapPings());
    testState.pingsEnabled = true;

    act(() => {
      expect(result.current(createMapMouseEvent())).toBe(true);
    });

    expect(socket.emit).toHaveBeenCalledWith(
      GatewayEvent.MAP_PING_SEND,
      { expectedMapId: 42, x: 12, y: 8 },
      expect.any(Function),
    );
  });

  it.each([
    {
      name: "pings are disabled",
      configure: () => {
        testState.pingsEnabled = false;
      },
      event: createMapMouseEvent,
    },
    {
      name: "the socket is disconnected",
      configure: () => {
        testState.connected = false;
      },
      event: createMapMouseEvent,
    },
    {
      name: "the socket has not joined",
      configure: () => {
        testState.joined = false;
      },
      event: createMapMouseEvent,
    },
    {
      name: "the trigger is outside a map surface",
      configure: () => undefined,
      event: createOutsideMouseEvent,
    },
  ])("stays silent when $name", ({ configure, event }) => {
    configure();
    const { result } = renderHook(() => useMapPings());

    act(() => {
      expect(result.current(event())).toBe(false);
    });

    expect(playSound).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("does not replay the local sound when the gateway rejects the ping", () => {
    const { result } = renderHook(() => useMapPings());
    act(() => {
      result.current(createMapMouseEvent());
    });
    const acknowledgement = socket.emit.mock.calls[0]?.[2] as (
      error: Error | null,
      response?: MapPingAck,
    ) => void;

    act(() => {
      acknowledgement(null, {
        status: "rejected",
        code: "invalid-context",
      });
    });

    expect(controller.remove).toHaveBeenCalledWith("local-ping-1");
    expect(playSound).toHaveBeenCalledTimes(1);
  });

  it("keeps playing one sound for a received remote ping", () => {
    renderHook(() => useMapPings());
    const event: MapPingEvent = {
      pingId: "remote-ping-1",
      world: "aether",
      mapId: 42,
      x: 12,
      y: 8,
      sender: { characterId: "123", name: "Other" },
      createdAt: Date.now(),
    };

    act(() => {
      socketHandlers.get(GatewayEvent.MAP_PING_RECEIVE)?.(event);
    });

    expect(controller.addRemote).toHaveBeenCalledWith(event);
    expect(playSound).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledWith("pings", "mapPing");
  });

  it("uses the latest cached preference for a received ping", () => {
    testState.pingsEnabled = false;
    renderHook(() => useMapPings());
    testState.pingsEnabled = true;
    const event: MapPingEvent = {
      pingId: "remote-ping-after-enable",
      world: "aether",
      mapId: 42,
      x: 12,
      y: 8,
      sender: { characterId: "123", name: "Other" },
      createdAt: Date.now(),
    };

    act(() => {
      socketHandlers.get(GatewayEvent.MAP_PING_RECEIVE)?.(event);
    });

    expect(controller.addRemote).toHaveBeenCalledWith(event);
    expect(playSound).toHaveBeenCalledWith("pings", "mapPing");
  });
});
