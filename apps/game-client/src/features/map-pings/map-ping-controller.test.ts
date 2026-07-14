import {
  MapPingController,
  resolveHandheldMiniMapTile,
  resolveMainMapTile,
} from "./map-ping-controller";

describe("map ping coordinates", () => {
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
    let drawFrame!: () => void;
    const renderer = { add: vi.fn(), getHighestOrderWithoutSort: () => 10 };
    const originalEngine = window.Engine;
    const originalApi = window.API;
    window.Engine = {
      apiData: { CALL_DRAW_ADD_TO_RENDERER: "call_draw_add_to_renderer" },
      renderer,
      map: {
        d: { id: 42 },
        size: { x: 100, y: 100 },
        offset: [0, 0],
      },
    } as never;
    window.API = {
      addCallbackToEvent: vi.fn((_event, callback) => {
        drawFrame = callback as () => void;
      }),
      removeCallbackFromEvent: vi.fn(),
    } as never;
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
    drawFrame();
    expect(renderer.add).toHaveBeenCalledTimes(1);

    now += 2_500;
    drawFrame();
    expect(renderer.add).toHaveBeenCalledTimes(1);

    controller.unregister();
    window.Engine = originalEngine;
    window.API = originalApi;
  });
});
