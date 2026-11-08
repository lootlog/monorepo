import { describe, expect, test } from "vitest";
import { LightPixels } from "./paint";

describe("LightPixels", () => {
  test("adds plots to what the layer holds the way `lighter` does, saturating at full", () => {
    const light = new LightPixels();
    // A 2×1 layer drawn at (10, 20); the first pixel already holds a red glow.
    light.reset(10, 20, 2, 1);
    const layer = new Uint8ClampedArray([200, 0, 0, 100, 0, 0, 0, 0]);

    light.add(10.4, 20, [0, 0, 255], 0.4);
    light.add(11, 19.6, [255, 255, 255], 1);
    light.add(11, 20, [255, 255, 255], 1);
    // Outside the layer.
    light.add(12, 20, [255, 255, 255], 1);
    light.addInto(layer);

    expect([...layer]).toEqual([99, 0, 129, 202, 255, 255, 255, 255]);
    expect(light.empty).toBe(true);
  });
});
