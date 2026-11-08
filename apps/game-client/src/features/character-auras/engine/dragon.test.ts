import { describe, expect, test } from "vitest";
import { Dragon } from "./dragon";

describe("Dragon", () => {
  test("the body keeps its spacing however the head moves", () => {
    const dragon = new Dragon({ x: 0, y: 0, z: 0 });

    for (let i = 0; i < 60; i++)
      dragon.step(
        {
          x: Math.cos(i * 0.3) * 30,
          y: Math.sin(i * 0.2) * 20,
          z: Math.sin(i * 0.3) * 30,
        },
        0.1,
      );

    const s = dragon.segments;

    for (let i = 1; i < s.length; i++) {
      const d = Math.hypot(
        s[i]!.x - s[i - 1]!.x,
        s[i]!.y - s[i - 1]!.y,
        s[i]!.z - s[i - 1]!.z,
      );

      expect(d).toBeLessThanOrEqual(dragon.spacing + 1e-6);
    }
  });

  test("the head reaches a still pearl and circles it", () => {
    const dragon = new Dragon({ x: 0, y: 0, z: 0 });

    for (let i = 0; i < 40; i++) dragon.step({ x: 60, y: -20, z: 0 }, 0.1);

    // It can't stop dead (it has a minimum speed), so it circles the pearl closely.
    expect(Math.hypot(dragon.head.x - 60, dragon.head.y + 20)).toBeLessThan(15);
  });

  test("turning is capped, so a pearl behind the head makes it swing round, not flip", () => {
    const dragon = new Dragon({ x: 0, y: 0, z: 0 });
    dragon.step({ x: -50, y: 0, z: 0 }, 0.025, 5, 1);
    // One small step: the heading has turned a little, not reversed.
    expect(dragon.heading.x).toBeGreaterThan(0.9);

    for (let i = 0; i < 20; i++)
      dragon.step({ x: -50, y: 0, z: 0 }, 0.025, 5, 1);

    expect(dragon.heading.x).toBeLessThan(0);
  });
});
