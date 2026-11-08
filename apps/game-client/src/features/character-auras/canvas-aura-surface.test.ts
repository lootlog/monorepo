import { ImageData as SkiaImageData } from "@napi-rs/canvas";
import { installTestCanvas } from "@/test/canvas";
import { testRuntimeWindow } from "@/test/test-runtime-window";
import type { RuntimeDrawable } from "@/lib/margonem-runtime/adapters/renderer-runtime-adapter";
import { canvasAuraRenderer } from "./canvas-aura-surface";

const DRAW_EVENT = "call-draw-add-to-renderer";

/** A Margonem game whose renderer collects what the draw hook adds each frame. */
function setGame() {
  const canvas = installTestCanvas();
  // Silhouettes put pixels they build into a Skia canvas.
  vi.stubGlobal("ImageData", SkiaImageData);
  const sprite = canvas.create(32, 48);
  sprite.context.fillStyle = "#fff";
  sprite.context.fillRect(8, 4, 16, 40);
  const drawables: RuntimeDrawable[] = [];
  let onDraw: (() => void) | null = null;

  testRuntimeWindow.API = {
    addCallbackToEvent: (_event: string, callback: () => void) => {
      onDraw = callback;
    },
    removeCallbackFromEvent: () => {
      onDraw = null;
    },
  };
  testRuntimeWindow.Engine = {
    apiData: { CALL_DRAW_ADD_TO_RENDERER: DRAW_EVENT },
    renderer: { add: (drawable: RuntimeDrawable) => drawables.push(drawable) },
    map: { d: { id: 1 }, getOffset: () => [0, 0] },
    others: {
      getById: () => ({
        imgLoaded: true,
        fh: 48,
        getOrder: () => 10,
        drawIcon: (context: CanvasRenderingContext2D) =>
          context.drawImage(sprite.canvas, 0, 0, 32, 48, 100, 100, 32, 48),
      }),
    },
  };

  return {
    canvas,
    /** One game frame: the draw hook adds drawables, then the game draws them. */
    playFrame(context: CanvasRenderingContext2D) {
      drawables.length = 0;
      onDraw?.();

      for (const drawable of drawables) drawable.draw(context);

      return drawables.length;
    },
  };
}

afterEach(() => {
  canvasAuraRenderer.setTargets(new Map());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete testRuntimeWindow.API;
  delete testRuntimeWindow.Engine;
});

it("stops drawing an aura whose drawing keeps failing although its update succeeds", () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const game = setGame();
  // A game context that fails every draw, while the frame update still succeeds.
  const { context } = game.canvas.create(800, 600);
  vi.spyOn(context, "getTransform").mockImplementation(() => {
    throw new Error("context lost");
  });
  canvasAuraRenderer.setTargets(new Map([["42", "storm"]]));

  expect(game.playFrame(context)).toBe(2);

  for (let frame = 0; frame < 200; frame++) game.playFrame(context);

  expect(game.playFrame(context)).toBe(0);
});
