import { describe, expect, test } from "vitest";
import { fighter } from "./fight.fixtures";
import { simulateFights } from "./fight-summary";

describe("simulateFights", () => {
  test("splits the damage each fighter takes by source into the life they lose", () => {
    const summary = simulateFights(
      {
        teams: [
          [fighter({ name: "truciciel", poison: { damage: 300, slow: 0 } })],
          [fighter({ name: "kontra", counterChance: 20, critChance: 30 })],
        ],
      },
      { runs: 50, seed: 3 },
    );

    const [poisoner, counter] = summary.fighters;

    for (const side of [poisoner, counter]) {
      const { strike, skill, overTime } = side?.averageTaken ?? {};
      const lost = (side?.maxHp ?? 0) * (1 - (side?.averageHpLeft ?? 0));

      expect((strike ?? 0) + (skill ?? 0) + (overTime ?? 0)).toBeCloseTo(
        lost,
        0,
      );
    }

    expect(counter?.averageTaken.overTime).toBeGreaterThan(0);
    expect(poisoner?.averageTaken.overTime).toBe(0);
  });
});
