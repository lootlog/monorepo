import {
  rendererRuntimeAdapter,
  type RuntimeDrawable,
} from "./renderer-runtime-adapter";
import { installTestCanvas } from "@/test/canvas";
import { testRuntimeWindow } from "@/test/test-runtime-window";

describe("renderer runtime adapter", () => {
  const originalEngine = testRuntimeWindow.Engine;
  const originalApi = testRuntimeWindow.API;

  afterEach(() => {
    testRuntimeWindow.Engine = originalEngine;
    testRuntimeWindow.API = originalApi;
    vi.restoreAllMocks();
  });

  it("keeps a throwing frame callback out of the game loop and detaches it after a long failing run", () => {
    const callbacks = new Set<() => void>();
    testRuntimeWindow.Engine = {
      apiData: { CALL_DRAW_ADD_TO_RENDERER: "call_draw_add_to_renderer" },
    };
    testRuntimeWindow.API = {
      addCallbackToEvent: (_event: string, callback: () => void) =>
        callbacks.add(callback),
      removeCallbackFromEvent: (_event: string, callback: () => void) =>
        callbacks.delete(callback),
    };
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let calls = 0;

    rendererRuntimeAdapter.subscribeDraw(() => {
      calls += 1;
      throw new Error("adapter mismatch");
    });

    const [gameCallback] = callbacks;

    if (!gameCallback) throw new Error("Expected a registered callback");

    for (let frame = 0; frame < 120; frame += 1) {
      expect(() => gameCallback()).not.toThrow();
    }

    expect(callbacks.size).toBe(0);
    gameCallback();
    expect(calls).toBe(120);
  });

  it("hands the renderer one stable drawable whose errors never reach the game", () => {
    const added: RuntimeDrawable[] = [];
    testRuntimeWindow.Engine = {
      renderer: { add: (drawable: RuntimeDrawable) => added.push(drawable) },
    };

    const draw = vi.fn<(context: CanvasRenderingContext2D) => void>(() => {
      throw new Error("sprite not loaded");
    });

    const drawable: RuntimeDrawable = {
      draw,
      getAlwaysDraw: () => true,
      getOrder: () => 7,
    };

    installTestCanvas();
    const context = document.createElement("canvas").getContext("2d");

    if (!context) throw new Error("Expected a 2D context");

    rendererRuntimeAdapter.addDrawable(drawable);
    rendererRuntimeAdapter.addDrawable(drawable);

    expect(added[0]).toBe(added[1]);
    expect(added[0]?.getOrder()).toBe(7);
    expect(() => added[0]?.draw(context)).not.toThrow();
    expect(draw).toHaveBeenCalledWith(context);
  });
});
