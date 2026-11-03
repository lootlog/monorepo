import { describe, expect, it } from "bun:test";
import { attackSpeedFromAgility, itemAttackSpeed } from "./attack-speed.js";

// The formulas are the game's, from its combat mechanics documentation at
// https://pomoc.margonem.pl/index/view,372.
describe("attack speed", () => {
  it("gives attack speed from agility in two steps", () => {
    expect(attackSpeedFromAgility(50)).toBe(1);
    expect(attackSpeedFromAgility(150)).toBeCloseTo(2.1);
  });

  it("adds an item's attack speed in hundredths to its agility and all attributes", () => {
    // Wspomnienie morskiego potwora VII: 3,08 SA and 337 agility.
    expect(itemAttackSpeed({ sa: 308, dz: 337, hp: 4000 })).toBe(3.754);
    // Artefakt minionej ery: 3,83 SA and 83 to all attributes.
    expect(itemAttackSpeed({ sa: 383, da: 83, slow: 94 })).toBe(3.996);
  });
});
