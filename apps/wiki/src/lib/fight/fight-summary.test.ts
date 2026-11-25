import { describe, expect, test } from "vitest";
import { fighter, NO_DAMAGE } from "./fight.fixtures";
import { simulateFight } from "./fight-simulator";
import { seededRandom, simulateFights } from "./fight-summary";

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

  test("replays every listed fight from its seed with the outcome it recorded", () => {
    const setup = {
      teams: [
        [fighter({ name: "krytyk", critChance: 40 })],
        [fighter({ name: "kontra", counterChance: 25, evadePoints: 200 })],
      ],
    };

    const { fights } = simulateFights(setup, { runs: 30, seed: 11 });

    for (const fight of fights) {
      const replay = simulateFight(setup, seededRandom(fight.seed), () => {});

      expect({
        winner: replay.winner,
        moves: replay.moves,
        hpLeft: replay.fighters.map(({ hpLeft }) => hpLeft / 50_000),
      }).toEqual({
        winner: fight.winner,
        moves: fight.moves,
        hpLeft: fight.hpLeft,
      });
    }
  });

  test("tracks life after every move and holds a finished fight at its final state", () => {
    const summary = simulateFights(
      {
        teams: [
          [fighter({ name: "napastnik" })],
          [fighter({ name: "bezbronny", physical: NO_DAMAGE })],
        ],
      },
      { runs: 40, seed: 5 },
    );

    const attacker = summary.hpAfterMove.map((bands) => bands[0]);
    const victim = summary.hpAfterMove.map((bands) => bands[1]?.median ?? 1);

    expect(summary.hpAfterMove).toHaveLength(summary.moves.longest);
    expect(attacker.every((band) => band?.low === 1)).toBe(true);
    expect(victim).toEqual([...victim].sort((left, right) => right - left));
    expect(victim.at(-1)).toBe(0);
    expect(summary.hpAfterMove.at(-1)?.[1]?.high).toBe(0);
  });
});
