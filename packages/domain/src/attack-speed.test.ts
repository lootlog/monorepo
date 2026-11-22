import { describe, expect, it } from "bun:test";
import { attackSpeedFromAgility, itemAttackSpeed } from "./attack-speed.js";

describe("attack speed", () => {
  it("gives attack speed from agility in two steps", () => {
    expect(attackSpeedFromAgility(50)).toBe(1);
    expect(attackSpeedFromAgility(150)).toBeCloseTo(2.1);
  });

  it("adds an item's attack speed in hundredths to its agility and all attributes", () => {
    expect(itemAttackSpeed({ sa: 308, dz: 337, hp: 4000 })).toBe(3.754);
    expect(itemAttackSpeed({ sa: 383, da: 83, slow: 94 })).toBe(3.996);
  });
});
