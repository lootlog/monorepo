import { ImageData as SkiaImageData } from "@napi-rs/canvas";
import { installTestCanvas } from "@/test/canvas";
import { testRuntimeWindow } from "@/test/test-runtime-window";
import type { RuntimeDrawable } from "@/lib/margonem-runtime/adapters/renderer-runtime-adapter";
import { canvasAuraRenderer } from "./canvas-aura-surface";

const DRAW_EVENT = "call-draw-add-to-renderer";

/** A Margonem game whose renderer collects what the draw hook adds each frame. */
function setGame(othersX: Record<string, number> = {}) {
  const canvas = installTestCanvas();
  // Silhouettes put pixels they build into a Skia canvas.
  vi.stubGlobal("ImageData", SkiaImageData);
  const sprite = canvas.create(32, 48);
  sprite.context.fillStyle = "#fff";
  sprite.context.fillRect(8, 4, 16, 40);
  const drawables: RuntimeDrawable[] = [];

  const character = (x: number, order: number) => ({
    imgLoaded: true,
    fh: 48,
    getOrder: () => order,
    drawIcon: (context: CanvasRenderingContext2D) =>
      context.drawImage(sprite.canvas, 0, 0, 32, 48, x, 100, 32, 48),
  });

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
    hero: { ...character(100, 0), d: { id: 0 } },
    others: {
      getById: (id: string) => character(othersX[id] ?? 100, Number(id)),
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
    /** The characters whose auras the last frame drew, by their draw order. */
    drawnOrders() {
      return [...new Set(drawables.map((d) => Math.round(d.getOrder())))];
    },
  };
}

afterEach(() => {
  canvasAuraRenderer.setTargets(new Map());
  canvasAuraRenderer.setOthersLimit(null);
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

it("draws only the auras nearest the hero while others are limited, and all again without the limit", () => {
  const game = setGame({ "1": 600, "2": 140, "3": 300 });
  const { context } = game.canvas.create(800, 600);
  canvasAuraRenderer.setOthersLimit(2);
  canvasAuraRenderer.setTargets(
    new Map([
      ["1", "storm"],
      ["2", "frost"],
      ["3", "divine"],
    ]),
  );

  game.playFrame(context);

  expect(game.drawnOrders().toSorted()).toEqual([2, 3]);

  canvasAuraRenderer.setOthersLimit(null);
  game.playFrame(context);

  expect(game.drawnOrders().toSorted()).toEqual([1, 2, 3]);
});
