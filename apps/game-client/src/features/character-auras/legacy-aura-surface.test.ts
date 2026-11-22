import { ImageData as SkiaImageData } from "@napi-rs/canvas";
import { installTestCanvas } from "@/test/canvas";
import { installLegacyMap, installLegacySprites } from "@/test/legacy-map";
import { legacyAuraRenderer } from "./legacy-aura-surface";

let map: ReturnType<typeof installLegacyMap>;

let canvas: ReturnType<typeof installTestCanvas>;

let pendingFrame: FrameRequestCallback | null = null;

let now = 0;

const AURA_TICK_MS = 100;

const FRAME_MS = 16;

function playFrame(elapsed = AURA_TICK_MS): void {
  now += elapsed;
  const frame = pendingFrame;
  pendingFrame = null;
  frame?.(now);
}

function painted(layer: HTMLCanvasElement): boolean {
  const context = layer.getContext("2d");

  if (!context || layer.width === 0) return false;
  const { data } = context.getImageData(0, 0, layer.width, layer.height);

  return data.some((value, index) => index % 4 === 3 && value > 0);
}

beforeEach(() => {
  canvas = installTestCanvas();
  vi.stubGlobal("ImageData", SkiaImageData);
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    pendingFrame = callback;

    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    pendingFrame = null;
  });

  const sprite = canvas.create(128, 192);
  sprite.context.fillStyle = "#fff";
  sprite.context.fillRect(8, 4, 16, 40);
  const url = sprite.canvas.toDataURL();
  installLegacySprites([{ url, width: 128, height: 192 }]);
  map = installLegacyMap();
  map.addOther("42", {
    sprite: { url, width: 128, height: 192 },
    rx: 5,
    ry: 5,
  });
});

afterEach(() => {
  legacyAuraRenderer.setTargets(new Map());
  map.dispose();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("paints an SI player's aura under and over them until they leave the map", () => {
  const element = document.getElementById("other42");
  legacyAuraRenderer.setTargets(new Map([["42", "storm"]]));

  for (let frame = 0; frame < 5; frame++) playFrame();

  const back = element?.previousSibling;
  const front = element?.nextSibling;

  if (
    !(back instanceof HTMLCanvasElement) ||
    !(front instanceof HTMLCanvasElement)
  ) {
    throw new Error("The aura layers are not beside the player");
  }

  expect(painted(back)).toBe(true);

  map.removeOther("42");
  playFrame();

  expect(map.base.querySelector("canvas")).toBeNull();
});

it("stops its frame loop once no character wears an aura", () => {
  legacyAuraRenderer.setTargets(new Map([["42", "storm"]]));
  playFrame();
  legacyAuraRenderer.setTargets(new Map());

  expect(pendingFrame).toBeNull();
  expect(map.base.querySelector("canvas")).toBeNull();
});

it("repaints an SI aura between its ticks only once the player moves", () => {
  const element = document.getElementById("other42");
  legacyAuraRenderer.setTargets(new Map([["42", "storm"]]));

  for (let frame = 0; frame < 5; frame++) playFrame();

  const back = element?.previousSibling;

  if (!element || !(back instanceof HTMLCanvasElement)) {
    throw new Error("The aura layer is not beside the player");
  }

  const context = back.getContext("2d");

  const cornerMarkSurvives = () =>
    context?.getImageData(0, 0, 1, 1).data[3] === 255;

  context?.setTransform(1, 0, 0, 1, 0, 0);
  context?.fillRect(0, 0, 1, 1);

  playFrame(FRAME_MS);
  playFrame(FRAME_MS);

  expect(cornerMarkSurvives()).toBe(true);

  element.style.left = `${Number.parseFloat(element.style.left) + 4}px`;
  playFrame(FRAME_MS);

  expect(cornerMarkSurvives()).toBe(false);
  expect(painted(back)).toBe(true);
});
