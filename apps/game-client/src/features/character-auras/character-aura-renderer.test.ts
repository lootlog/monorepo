import { ImageData as SkiaImageData } from "@napi-rs/canvas";
import { installTestCanvas } from "@/test/canvas";
import { testRuntimeWindow } from "@/test/test-runtime-window";
import type { RuntimeDrawable } from "@/lib/margonem-runtime/adapters/renderer-runtime-adapter";
import { characterAuraRenderer } from "./character-aura-renderer";

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

/** SI's globals (engine.js:9, :66) and its `#base` map holding `#hero`. */
type LegacyWindow = Window & {
  g?: { battle?: unknown };
  hero?: { rx: number; ry: number; fw: number; fh: number };
  map?: { id: number; x: number; y: number; scrollpos: [number, number] };
};

const legacyWindow: LegacyWindow = window;

/** A legacy-interface map scrolled to (100, 50) with the hero standing at tile (5, 6). */
function setLegacyGame() {
  const canvas = installTestCanvas();
  vi.stubGlobal("ImageData", SkiaImageData);
  const sprite = canvas.create(128, 192);
  sprite.context.fillStyle = "#fff";
  sprite.context.fillRect(8, 4, 16, 40);
  // SI loads sprites into blob urls; the adapter decodes its own copy of one.
  const image = document.createElement("img");
  Object.defineProperties(image, {
    complete: { value: true },
    naturalWidth: { value: 128 },
    naturalHeight: { value: 192 },
  });
  canvas.registerLoadedImage(image, sprite.canvas);
  vi.stubGlobal("Image", function TestImage() {
    return image;
  });

  let onFrame: FrameRequestCallback | null = null;
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    onFrame = callback;

    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    onFrame = null;
  });

  legacyWindow.g = {};
  legacyWindow.hero = { rx: 5, ry: 6, fw: 32, fh: 48 };
  legacyWindow.map = { id: 7, x: 40, y: 40, scrollpos: [100, 50] };
  const base = document.createElement("div");
  base.id = "base";
  const hero = document.createElement("div");
  hero.id = "hero";
  hero.style.backgroundImage = 'url("blob:sprite")';
  hero.style.backgroundPosition = "0px 0px";
  hero.style.zIndex = "22";
  base.append(hero);
  document.body.append(base);

  return {
    base,
    playFrame() {
      onFrame?.(performance.now());
    },
  };
}

afterEach(() => {
  characterAuraRenderer.setTargets(new Map());
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  delete testRuntimeWindow.API;
  delete testRuntimeWindow.Engine;
  delete legacyWindow.g;
  delete legacyWindow.hero;
  delete legacyWindow.map;
  document.body.replaceChildren();
});

it("draws the SI hero's aura under and over the hero, scrolled with the map, and hides it in battle", () => {
  const game = setLegacyGame();
  characterAuraRenderer.setTargets(new Map([["hero", "storm"]]));
  game.playFrame();

  const [back, front] = game.base.querySelectorAll("canvas");

  // The hero's 32×48 frame sits at map (160, 176) (player.js:663-664); each
  // canvas reaches 86 px past it for the aura's padding and margin.
  expect(back?.style.zIndex).toBe("21");
  expect(front?.style.zIndex).toBe("23");
  expect(back?.style.transform).toMatch(/^translate\(74px, ?90px\)$/);
  expect(back?.width).toBe(32 + 86 * 2);
  expect(back?.hidden).toBe(false);
  // The outline hugs the sprite's body: drawn pixels flank it inside the canvas.
  const pixels = back?.getContext("2d")?.getImageData(0, 0, 204, 220).data;
  expect(pixels?.some((value, index) => index % 4 === 3 && value > 0)).toBe(
    true,
  );

  legacyWindow.g = { ...legacyWindow.g, battle: {} };
  game.playFrame();

  expect(back?.hidden).toBe(true);
  expect(front?.hidden).toBe(true);

  characterAuraRenderer.setTargets(new Map());

  expect(game.base.querySelector("canvas")).toBeNull();
});

it("stops drawing an aura whose drawing keeps failing although its update succeeds", () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  const game = setGame();
  // A game context that fails every draw, while the frame update still succeeds.
  const { context } = game.canvas.create(800, 600);
  vi.spyOn(context, "getTransform").mockImplementation(() => {
    throw new Error("context lost");
  });
  characterAuraRenderer.setTargets(new Map([["42", "storm"]]));

  expect(game.playFrame(context)).toBe(2);

  for (let frame = 0; frame < 200; frame++) game.playFrame(context);

  expect(game.playFrame(context)).toBe(0);
});
