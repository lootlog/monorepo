import { describe, expect, test } from "vitest";
import { bandOf, distanceField, posterizeAlpha } from "./pixel";

describe("posterizeAlpha", () => {
  test("snaps alpha to the given levels and clears faint pixels", () => {
    const data = new Uint8ClampedArray([
      0, 0, 0, 10, 0, 0, 0, 255, 0, 0, 0, 128, 0, 0, 0, 0,
    ]);

    posterizeAlpha(data, 4, 1, 3);
    expect(data[3]).toBe(0);
    expect(data[7]).toBe(255);
    expect([0, 128, 255]).toContain(data[11]!);
    expect(data[15]).toBe(0);
  });

  test("dithers a mid alpha into a mix of the neighbouring levels", () => {
    const size = 8;
    const data = new Uint8ClampedArray(size * size * 4);

    for (let i = 3; i < data.length; i += 4) data[i] = 96;
    posterizeAlpha(data, size, size, 2);
    const on = [...data].filter((v, i) => i % 4 === 3 && v === 255).length;
    expect(on).toBeGreaterThan(0);
    expect(on).toBeLessThan(size * size);
  });
});

describe("distanceField", () => {
  test("measures orthogonal and diagonal steps from the nearest solid pixel", () => {
    // 5×5 with only the centre solid.
    const solid = Array.from({ length: 25 }, (_, i) => i === 12);
    const d = distanceField(solid, 5, 5);
    expect(d[12]).toBe(0);
    expect(d[13]).toBe(1);
    expect(d[18]).toBeCloseTo(Math.SQRT2);
    expect(d[14]).toBe(2);
  });
});

describe("bandOf", () => {
  test("puts a 1 px outline only on orthogonal neighbours", () => {
    expect(bandOf(0, 0, 0)).toBe(-1);
    expect(bandOf(1, 0, 0)).toBe(0);
    expect(bandOf(Math.SQRT2, 0, 0)).toBe(1);
  });

  test("checkerboards the third band and leaves nothing far out", () => {
    expect(bandOf(3, 0, 0)).toBe(2);
    expect(bandOf(3, 1, 0)).toBe(-1);
    expect(bandOf(20, 0, 0)).toBe(-1);
  });
});
