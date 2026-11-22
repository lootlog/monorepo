import type { AirTagTarget } from "@lootlog/schema/air-tag";
import { selectUnseenAirTagEnemies } from "./who-is-here-air-tag-enemies";

const target = (overrides: Partial<AirTagTarget>): AirTagTarget => ({
  targetId: "1",
  nickname: "Target",
  relation: 6,
  x: 1,
  y: 1,
  observedAt: 1_000,
  ...overrides,
});

describe("selectUnseenAirTagEnemies", () => {
  it("lists only clan enemies the player cannot see, leaving out one member's personal enemy", () => {
    const enemies = selectUnseenAirTagEnemies(
      [
        target({ targetId: "neutral", nickname: "Neutral", relation: 1 }),
        target({ targetId: "personal", nickname: "Alpha", relation: 3 }),
        target({ targetId: "clan", nickname: "Zeta" }),
        target({ targetId: "other", nickname: "Beta" }),
        target({ targetId: "visible" }),
      ],
      ({ targetId }) => targetId === "visible",
    );

    expect(enemies.map((enemy) => enemy.targetId)).toEqual(["other", "clan"]);
  });
});
