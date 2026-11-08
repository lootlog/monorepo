import { installLegacyMap, installLegacySprites } from "@/test/legacy-map";
import { legacyAuraRuntimeAdapter } from "./legacy-aura-runtime-adapter";

const SPRITE = { url: "blob:https://x/sprite", width: 128, height: 192 };

let map: ReturnType<typeof installLegacyMap>;

beforeEach(() => {
  installLegacySprites([SPRITE]);
  map = installLegacyMap();
});

afterEach(() => {
  map.dispose();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it("reads the walking frame, map position and row order SI shows for an other", () => {
  // Mid-walk to the right: step 2 of direction 2 at x 10.25, y 6.
  const element = map.addOther("42", {
    sprite: SPRITE,
    rx: 10.25,
    ry: 6,
    step: 2,
    dir: 2,
  });

  const other = legacyAuraRuntimeAdapter.getOther("42");

  expect(other?.element).toBe(element);
  expect(other?.frame).toMatchObject({
    // The background is shifted right by step × width, so it shows column 2.
    sx: 64,
    sy: 96,
    sw: 32,
    sh: 48,
    dx: 10.25 * 32,
    dy: 6 * 32 - 16,
  });
  expect(other?.order).toBe(22);
  expect(other?.feetHeight).toBe(48);
});

it("draws only the part above the water of a wading character", () => {
  map.addOther("42", { sprite: SPRITE, rx: 3, ry: 3, water: 12 });

  const frame = legacyAuraRuntimeAdapter.getOther("42")?.frame;

  expect(frame).toMatchObject({ sy: 0, sh: 36, dy: 3 * 32 - 16 + 12 });
});

it("reads the hero from its own element", () => {
  map.addHero({ sprite: SPRITE, rx: 1, ry: 2 });

  expect(legacyAuraRuntimeAdapter.getHero()?.frame).toMatchObject({
    dx: 32,
    dy: 48,
  });
});

it("has no character for an other that left or whose sprite is not loaded", () => {
  map.addOther("42", { sprite: SPRITE, rx: 1, ry: 1 });
  map.addOther("43", {
    sprite: { url: "blob:https://x/loading", width: 128, height: 192 },
    rx: 2,
    ry: 2,
  });
  map.removeOther("42");

  expect(legacyAuraRuntimeAdapter.getOther("42")).toBeNull();
  expect(legacyAuraRuntimeAdapter.getOther("43")).toBeNull();
});

it("keeps the layers right under and over their character as the map changes", () => {
  const element = map.addOther("42", { sprite: SPRITE, rx: 1, ry: 1 });
  const layers = legacyAuraRuntimeAdapter.createLayers();
  const box = { x: 0, y: 0, width: 96, height: 120 };

  legacyAuraRuntimeAdapter.placeLayers(layers, element, box);
  // Another player arrives and the character steps down a row.
  map.addOther("43", { sprite: SPRITE, rx: 2, ry: 1 });
  element.before(document.createElement("div"));
  element.style.zIndex = "14";
  legacyAuraRuntimeAdapter.placeLayers(layers, element, box);

  expect(element.previousSibling).toBe(layers.back);
  expect(element.nextSibling).toBe(layers.front);
  expect(layers.back.style.zIndex).toBe("14");
  expect(layers.front.style.zIndex).toBe("14");

  legacyAuraRuntimeAdapter.removeLayers(layers);

  expect(map.base.querySelector("canvas")).toBeNull();
});
