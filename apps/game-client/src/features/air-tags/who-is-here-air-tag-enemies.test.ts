import type { AirTagTarget } from "@lootlog/schema/air-tag";
import { selectUnseenAirTagEnemies } from "./who-is-here-air-tag-enemies";

const target = (overrides: Partial<AirTagTarget>): AirTagTarget => ({
  targetId: "1",
  nickname: "Target",
  relation: 1,
  x: 1,
  y: 1,
  observedAt: 1_000,
  ...overrides,
});

describe("selectUnseenAirTagEnemies", () => {
  it("lists only enemies the player cannot see, clan enemies first, keeping a recent enemy sighting by any member", () => {
    const enemies = selectUnseenAirTagEnemies(
      [
        target({ targetId: "neutral", nickname: "Neutral" }),
        target({ targetId: "personal", nickname: "Alpha", relation: 3 }),
        target({ targetId: "clan", nickname: "Zeta", relation: 6 }),
        // Reported as neutral now, but another member saw a clan enemy 2 s ago.
        target({
          targetId: "sticky",
          nickname: "Beta",
          clanEnemyObservedAt: 3_000,
        }),
        target({ targetId: "visible", relation: 6 }),
      ],
      {
        now: 5_000,
        ttlMs: 10_000,
        isShownByGame: (targetId) => targetId === "visible",
      },
    );

    expect(enemies.map((enemy) => enemy.targetId)).toEqual([
      "sticky",
      "clan",
      "personal",
    ]);
  });
});
