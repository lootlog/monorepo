import { act, renderHook } from "@testing-library/react";
import type { MapPingAck, MapPingEvent, MapPingType } from "@lootlog/types";
import { GatewayEvent } from "@/config/gateway";
import { useMapPings } from "./use-map-pings";
import { useGameStore } from "@/store/game.store";

const testState = vi.hoisted(() => ({
  connected: true,
  gameInterface: "ni" as "ni" | "si",
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
const interactionController = vi.hoisted(() => ({
  begin: vi.fn(() => true),
  cancel: vi.fn(),
  complete: vi.fn(() => ({
    mapId: 42,
    tile: { x: 12, y: 8 },
    type: "attention" as MapPingType,
  })),
  updatePointer: vi.fn(),
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
    get interface() {
      return testState.gameInterface;
    },
    map: { id: 42 },
  },
}));

vi.mock("@/lib/margonem-runtime/runtime-adapter", () => ({
  getMargonemInterface: () => testState.gameInterface,
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

vi.mock("./map-ping-interaction-controller", () => ({
  createMapPingPressIdentity: (event: KeyboardEvent | MouseEvent) =>
    event instanceof KeyboardEvent
      ? { kind: "keyboard", code: event.code }
      : { kind: "mouse", button: event.button },
  mapPingInteractionController: interactionController,
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

const triggerMapPingTap = (handlers: ReturnType<typeof useMapPings>) => {
  const started = handlers.onMapPingStart(createMapMouseEvent());
  handlers.onMapPingEnd(new MouseEvent("mouseup", { button: 1 }));
  return started;
};

const setGameInterface = (gameInterface: "ni" | "si") => {
  const game = useGameStore.getState().game;
  if (!game) throw new Error("Expected initialized game state");
  useGameStore.getState().replaceGame({ ...game, interface: gameInterface });
};

describe("useMapPings", () => {
  beforeEach(() => {
    testState.connected = true;
    testState.gameInterface = "ni";
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
    interactionController.begin.mockReturnValue(true);
    interactionController.complete.mockReturnValue({
      mapId: 42,
      tile: { x: 12, y: 8 },
      type: "attention",
    });
    useGameStore.getState().replaceGame({
      hero: {
        accountId: "account-1",
        characterId: "1",
        currentHp: 1,
        icon: "hero.gif",
        level: 300,
        maxHp: 1,
        name: "Sender",
        profession: "w",
        x: 1,
        y: 2,
      },
      interface: "ni",
      map: { id: 42, name: "Map", visibility: 30 },
      world: "aether",
    });
  });

  it("plays one sound immediately when a local ping is triggered", () => {
    const { result } = renderHook(() => useMapPings());

    act(() => {
      expect(triggerMapPingTap(result.current)).toBe(true);
    });

    expect(controller.addOptimistic).toHaveBeenCalledWith(
      { x: 12, y: 8 },
      42,
      "Sender",
      "attention",
      "Uwaga",
    );
    expect(interactionController.begin).toHaveBeenCalledWith({
      identity: { kind: "mouse", button: 1 },
      mapId: 42,
      origin: { x: 0, y: 0 },
      tile: { x: 12, y: 8 },
    });
    expect(playSound).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledWith("pings", "mapPing", {
      playbackRate: 1,
      preservesPitch: false,
    });
    expect(socket.emit).toHaveBeenCalledWith(
      GatewayEvent.MAP_PING_SEND,
      { expectedMapId: 42, type: "attention", x: 12, y: 8 },
      expect.any(Function),
    );
  });

  it("propagates a selected contextual type to rendering, sound, and socket", () => {
    interactionController.complete.mockReturnValueOnce({
      mapId: 42,
      tile: { x: 12, y: 8 },
      type: "enemy",
    });
    const { result } = renderHook(() => useMapPings());

    act(() => {
      triggerMapPingTap(result.current);
    });

    expect(controller.addOptimistic).toHaveBeenCalledWith(
      { x: 12, y: 8 },
      42,
      "Sender",
      "enemy",
      "Wróg",
    );
    expect(playSound).toHaveBeenCalledWith("pings", "mapPing", {
      playbackRate: 1.35,
      preservesPitch: false,
    });
    expect(socket.emit).toHaveBeenCalledWith(
      GatewayEvent.MAP_PING_SEND,
      { expectedMapId: 42, type: "enemy", x: 12, y: 8 },
      expect.any(Function),
    );
  });

  it("uses the latest cached preference for a local ping trigger", () => {
    testState.pingsEnabled = false;
    const { result } = renderHook(() => useMapPings());
    testState.pingsEnabled = true;

    act(() => {
      expect(triggerMapPingTap(result.current)).toBe(true);
    });

    expect(socket.emit).toHaveBeenCalledWith(
      GatewayEvent.MAP_PING_SEND,
      { expectedMapId: 42, type: "attention", x: 12, y: 8 },
      expect.any(Function),
    );
  });

  it("does not trigger a local ping on the old interface", () => {
    testState.gameInterface = "si";
    setGameInterface("si");
    const { result } = renderHook(() => useMapPings());

    act(() => {
      expect(result.current.onMapPingStart(createMapMouseEvent())).toBe(false);
    });

    expect(controller.register).not.toHaveBeenCalled();
    expect(controller.addOptimistic).not.toHaveBeenCalled();
    expect(playSound).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("installs no controller, pointer, or socket listeners while disabled", () => {
    testState.pingsEnabled = false;
    const windowAddEventListener = vi.spyOn(window, "addEventListener");

    renderHook(() => useMapPings());

    expect(controller.register).not.toHaveBeenCalled();
    expect(
      windowAddEventListener.mock.calls.some(
        ([eventName]) => eventName === "mousemove",
      ),
    ).toBe(false);
    expect(socket.on).not.toHaveBeenCalledWith(
      GatewayEvent.MAP_PING_RECEIVE,
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
      expect(result.current.onMapPingStart(event())).toBe(false);
    });

    expect(playSound).not.toHaveBeenCalled();
    expect(socket.emit).not.toHaveBeenCalled();
  });

  it("does not replay the local sound when the gateway rejects the ping", () => {
    const { result } = renderHook(() => useMapPings());
    act(() => {
      triggerMapPingTap(result.current);
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
      type: "attention",
      x: 12,
      y: 8,
      sender: { characterId: "123", name: "Other" },
      createdAt: Date.now(),
    };

    act(() => {
      socketHandlers.get(GatewayEvent.MAP_PING_RECEIVE)?.(event);
    });

    expect(controller.addRemote).toHaveBeenCalledWith(event, "Uwaga");
    expect(playSound).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledWith("pings", "mapPing", {
      playbackRate: 1,
      preservesPitch: false,
    });
  });

  it("subscribes for received pings after the preference becomes enabled", () => {
    testState.pingsEnabled = false;
    const { rerender } = renderHook(() => useMapPings());
    testState.pingsEnabled = true;
    rerender();
    const event: MapPingEvent = {
      pingId: "remote-ping-after-enable",
      world: "aether",
      mapId: 42,
      type: "attention",
      x: 12,
      y: 8,
      sender: { characterId: "123", name: "Other" },
      createdAt: Date.now(),
    };

    act(() => {
      socketHandlers.get(GatewayEvent.MAP_PING_RECEIVE)?.(event);
    });

    expect(controller.addRemote).toHaveBeenCalledWith(event, "Uwaga");
    expect(playSound).toHaveBeenCalledWith("pings", "mapPing", {
      playbackRate: 1,
      preservesPitch: false,
    });
  });

  it("ignores a received ping on the old interface", () => {
    testState.gameInterface = "si";
    setGameInterface("si");
    renderHook(() => useMapPings());
    const event: MapPingEvent = {
      pingId: "remote-ping-on-si",
      world: "aether",
      mapId: 42,
      type: "attention",
      x: 12,
      y: 8,
      sender: { characterId: "123", name: "Other" },
      createdAt: Date.now(),
    };

    act(() => {
      socketHandlers.get(GatewayEvent.MAP_PING_RECEIVE)?.(event);
    });

    expect(controller.addRemote).not.toHaveBeenCalled();
    expect(playSound).not.toHaveBeenCalled();
  });

  it("drops an unknown runtime ping type before presentation lookup", () => {
    renderHook(() => useMapPings());
    const event = {
      pingId: "remote-unsupported-ping",
      world: "aether",
      mapId: 42,
      type: "unsupported",
      x: 12,
      y: 8,
      sender: { characterId: "123", name: "Other" },
      createdAt: Date.now(),
    } as unknown as MapPingEvent;

    act(() => {
      socketHandlers.get(GatewayEvent.MAP_PING_RECEIVE)?.(event);
    });

    expect(controller.addRemote).not.toHaveBeenCalled();
    expect(playSound).not.toHaveBeenCalled();
  });
});
