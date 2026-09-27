import type {
  RuntimeCharacterRef,
  RuntimeDrawable,
} from "@/lib/margonem-runtime/adapters/renderer-runtime-adapter";
import {
  MapPingController,
  resolveHandheldMiniMapTile,
  resolveMainMapTile,
} from "./map-ping-controller";

describe("map ping coordinates", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps the per-frame draw listener detached while there are no pings", () => {
    const originalEngine = testRuntimeWindow.Engine;
    const originalApi = testRuntimeWindow.API;
    const addCallbackToEvent = vi.fn<() => void>();
    const removeCallbackFromEvent = vi.fn<() => void>();
    testRuntimeWindow.Engine = {
      apiData: { CALL_DRAW_ADD_TO_RENDERER: "call_draw_add_to_renderer" },
    };
    testRuntimeWindow.API = {
      addCallbackToEvent,
      removeCallbackFromEvent,
    };
    const controller = new MapPingController(() => 1_000);

    expect(controller.register()).toBe(true);
    expect(addCallbackToEvent).not.toHaveBeenCalled();

    controller.addRemote(
      {
        pingId: "ping-1",
        world: "aether",
        mapId: 42,
        type: "attention",
        x: 10,
        y: 20,
        sender: { characterId: "123", name: "Sender" },
        createdAt: 1_700_000_000_000,
      },
      "Uwaga",
    );
    expect(addCallbackToEvent).toHaveBeenCalledTimes(1);

    controller.remove("ping-1");
    expect(removeCallbackFromEvent).toHaveBeenCalledTimes(1);

    controller.unregister();
    testRuntimeWindow.Engine = originalEngine;
    testRuntimeWindow.API = originalApi;
  });

  it("retains at most the newest 256 active pings", () => {
    const controller = new MapPingController(() => 1_000);

    const createEvent = (index: number) => ({
      pingId: `ping-${index}`,
      world: "aether",
      mapId: 42,
      type: "attention" as const,
      x: 10,
      y: 20,
      sender: { characterId: "123", name: "Sender" },
      createdAt: 1_700_000_000_000,
    });

    for (let index = 0; index < 257; index += 1) {
      expect(controller.addRemote(createEvent(index), "Uwaga")).toBe(true);
    }

    expect(controller.addRemote(createEvent(0), "Uwaga")).toBe(true);
    expect(controller.addRemote(createEvent(256), "Uwaga")).toBe(false);
  });

  it("expires pings and detaches drawing even when no draw frame arrives", () => {
    vi.useFakeTimers();
    let now = 1_000;
    const originalEngine = testRuntimeWindow.Engine;
    const originalApi = testRuntimeWindow.API;
    const removeCallbackFromEvent = vi.fn<() => void>();
    testRuntimeWindow.Engine = {
      apiData: { CALL_DRAW_ADD_TO_RENDERER: "call_draw_add_to_renderer" },
    };
    testRuntimeWindow.API = {
      addCallbackToEvent: vi.fn<() => void>(),
      removeCallbackFromEvent,
    };
    const controller = new MapPingController(() => now);

    controller.register();
    controller.addRemote(
      {
        pingId: "ping-without-frame",
        world: "aether",
        mapId: 42,
        type: "attention",
        x: 10,
        y: 20,
        sender: { characterId: "123", name: "Sender" },
        createdAt: 1_700_000_000_000,
      },
      "Uwaga",
    );
    now += 10_000;

    vi.advanceTimersByTime(10_000);

    const removalCountBeforeCleanup = removeCallbackFromEvent.mock.calls.length;
    controller.unregister();
    testRuntimeWindow.Engine = originalEngine;
    testRuntimeWindow.API = originalApi;
    expect(removalCountBeforeCleanup).toBe(1);
  });

  it("resolves a main-map tile through CSS scaling and camera offset", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 600;
    canvas.height = 400;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 100,
      top: 50,
      width: 300,
      height: 200,
      right: 400,
      bottom: 250,
      x: 100,
      y: 50,
      toJSON: () => ({}),
    });

    expect(
      resolveMainMapTile(canvas, 148, 82, {
        offset: [64, 32],
        size: { x: 100, y: 100 },
        tileSize: 32,
      }),
    ).toEqual({ x: 5, y: 3 });
  });

  it("clamps main-map coordinates to the current map bounds", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 320;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 320,
      height: 320,
      right: 320,
      bottom: 320,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    expect(
      resolveMainMapTile(canvas, 319, 319, {
        offset: [64, 64],
        size: { x: 5, y: 7 },
        tileSize: 32,
      }),
    ).toEqual({ x: 4, y: 6 });
    expect(
      resolveMainMapTile(canvas, 0, 0, {
        offset: [-64, -32],
        size: { x: 5, y: 7 },
        tileSize: 32,
      }),
    ).toEqual({ x: 0, y: 0 });
  });

  it("resolves minimap tiles and ignores the empty map margin", () => {
    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 300;
    vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 300,
      right: 300,
      bottom: 300,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    const geometry = {
      margin: { left: 30, top: 0 },
      normalSize: 3,
      size: { x: 80, y: 100 },
    };

    expect(resolveHandheldMiniMapTile(canvas, 61, 61, geometry)).toEqual({
      x: 10,
      y: 20,
    });
    expect(resolveHandheldMiniMapTile(canvas, 10, 61, geometry)).toBeNull();
  });

  it("deduplicates received pings and stops rendering them after expiry", () => {
    let now = 1_000;
    let drawFrame: (() => void) | undefined;

    const renderer = {
      add: vi.fn<(drawable: RuntimeDrawable) => void>(),
      getHighestOrderWithoutSort: () => 10,
    };

    const originalEngine = testRuntimeWindow.Engine;
    const originalApi = testRuntimeWindow.API;
    testRuntimeWindow.Engine = {
      apiData: { CALL_DRAW_ADD_TO_RENDERER: "call_draw_add_to_renderer" },
      renderer,
      map: {
        d: { id: 42 },
        size: { x: 100, y: 100 },
        offset: [0, 0],
      },
    };
    testRuntimeWindow.API = {
      addCallbackToEvent: vi.fn<(event: string, callback: () => void) => void>(
        (_event, callback) => {
          drawFrame = callback;
        },
      ),
      removeCallbackFromEvent: vi.fn<() => void>(),
    };
    const controller = new MapPingController(() => now);

    const event = {
      pingId: "ping-1",
      world: "aether",
      mapId: 42,
      type: "attention" as const,
      x: 10,
      y: 20,
      sender: { characterId: "123", name: "Sender" },
      createdAt: 1_700_000_000_000,
    };

    expect(controller.register()).toBe(true);
    expect(controller.addRemote(event, "Uwaga")).toBe(true);
    expect(controller.addRemote(event, "Uwaga")).toBe(false);

    if (!drawFrame) throw new Error("Expected draw callback");
    drawFrame();
    expect(renderer.add).toHaveBeenCalledTimes(1);

    now += 2_500;
    drawFrame();
    expect(renderer.add).toHaveBeenCalledTimes(1);

    controller.unregister();
    testRuntimeWindow.Engine = originalEngine;
    testRuntimeWindow.API = originalApi;
  });

  it("lights a pinged monster behind its sprite until the ping expires or it leaves", () => {
    let now = 0;
    const frame = new Map<"draw", () => void>();
    let npcPresent = true;
    const added: RuntimeDrawable[] = [];

    const glow = {
      draw: vi.fn<(context: CanvasRenderingContext2D) => void>(),
      getAlwaysDraw: () => true,
      getOrder: () => 9.1,
      isPresent: () => npcPresent,
      setAlpha: vi.fn<(alpha: number) => void>(),
    };

    const createGlow = vi.fn<
      (character: RuntimeCharacterRef, color: string) => typeof glow
    >(() => glow);

    const controller = new MapPingController(
      () => now,
      {
        addDrawable: (drawable) => added.push(drawable),
        findPingableCharacterAt: () => null,
        getHandheldMiniMap: () => null,
        getHighestOrder: () => 20_007,
        getMapGeometry: () => ({
          id: 42,
          offset: [0, 0],
          size: { x: 100, y: 100 },
          tileSize: 32,
        }),
        getCharacterBounds: () => ({
          bottom: 320,
          left: 384,
          right: 416,
          top: 240,
        }),
        isAvailable: () => true,
        subscribeDraw: (callback) => {
          frame.set("draw", callback);

          return () => undefined;
        },
      },
      createGlow,
    );

    controller.register();
    controller.addOptimistic({ x: 12, y: 9 }, 42, "Me", "attention", "Uwaga");
    controller.addOptimistic({ x: 12, y: 9 }, 42, "Me", "enemy", "Bij", {
      kind: "npc",
      id: 91,
    });

    const drawFrame = frame.get("draw");

    if (!drawFrame) throw new Error("Expected draw callback");
    drawFrame();
    expect(createGlow).toHaveBeenCalledOnce();
    expect(createGlow.mock.calls[0]?.[0]).toEqual({ kind: "npc", id: 91 });
    expect(added).toContain(glow);

    added.length = 0;
    npcPresent = false;
    drawFrame();
    expect(added).not.toContain(glow);

    added.length = 0;
    npcPresent = true;
    now += 8_000;
    drawFrame();
    expect(added).not.toContain(glow);

    controller.unregister();
  });

  it("ends a character ping once the character leaves instead of returning to its tile", () => {
    const frame = new Map<"draw", () => void>();
    const present = new Set([91]);
    const added: RuntimeDrawable[] = [];
    const unsubscribe = vi.fn<() => void>();

    const controller = new MapPingController(
      () => 0,
      {
        addDrawable: (drawable) => added.push(drawable),
        findPingableCharacterAt: () => null,
        getHandheldMiniMap: () => null,
        getHighestOrder: () => 20_007,
        getMapGeometry: () => ({
          id: 42,
          offset: [0, 0],
          size: { x: 100, y: 100 },
          tileSize: 32,
        }),
        getCharacterBounds: ({ id }) =>
          present.has(id)
            ? { bottom: 320, left: 384, right: 416, top: 240 }
            : null,
        isAvailable: () => true,
        subscribeDraw: (callback) => {
          frame.set("draw", callback);

          return unsubscribe;
        },
      },
      () => ({
        draw: () => undefined,
        getAlwaysDraw: () => true,
        getOrder: () => 9.1,
        isPresent: () => true,
        setAlpha: () => undefined,
      }),
    );

    controller.register();
    controller.addOptimistic({ x: 12, y: 9 }, 42, "Me", "enemy", "Wróg", {
      kind: "player",
      id: 91,
    });

    const drawFrame = frame.get("draw");

    if (!drawFrame) throw new Error("Expected draw callback");
    drawFrame();
    expect(added.length).toBeGreaterThan(0);

    added.length = 0;
    present.delete(91);
    drawFrame();
    expect(added).toEqual([]);
    expect(unsubscribe).toHaveBeenCalledOnce();

    // A character this client never saw still shows the tile marker.
    controller.addOptimistic({ x: 12, y: 9 }, 42, "Me", "enemy", "Wróg", {
      kind: "player",
      id: 77,
    });
    frame.get("draw")?.();
    expect(added.length).toBeGreaterThan(0);

    controller.unregister();
  });
});

import { testRuntimeWindow } from "@/test/test-runtime-window";
