import { describe, expect, it } from "bun:test";
import type { BattlePayload } from "../src/battle-log.js";
import { findFinishingBlows } from "../src/finishing-blows.js";

describe("findFinishingBlows", () => {
  const warrior = (originalId: number, team: number) => ({
    originalId,
    name: `Warrior${originalId}`,
    lvl: 100,
    prof: "w",
    icon: "",
    team,
  });

  const battle = (m: string[]): BattlePayload["events"] => [
    {
      f: {
        w: {
          "101": warrior(101, 1),
          "102": warrior(102, 1),
          "201": warrior(201, 2),
          "202": warrior(202, 2),
        },
        m,
      },
    },
  ];

  it("credits each death to the warrior whose action dropped its HP to zero", () => {
    expect(
      findFinishingBlows(
        battle([
          "101=100;201=40;+dmg=600;-dmg=600",
          "102=100;201=0;+dmg=400;-dmg=400",
          "101=100;201=0;+dmg=10;-dmg=10",
          "0;0;winner=Warrior101;loser=Warrior201",
        ]),
      ),
    ).toEqual([{ killerId: "102", victimId: "201", moveIndex: 1 }]);
  });

  it("credits an attacker killed by a counter or reflected damage to the target", () => {
    expect(
      findFinishingBlows(battle(["201=0;101=80;+dmg=300;-contra;-dmg=300"])),
    ).toEqual([{ killerId: "101", victimId: "201", moveIndex: 0 }]);
  });

  it("credits a damage-over-time death to the last opponent that hit the victim", () => {
    expect(
      findFinishingBlows(
        battle([
          "101=100;201=50;+dmg=500;+wound;-dmg=500",
          "102=100;201=20;+dmg=300;+wound;-dmg=300",
          "201=0;0;wound=2817,20",
        ]),
      ),
    ).toEqual([{ killerId: "102", victimId: "201", moveIndex: 2 }]);
  });

  it("does not credit the death of an ally", () => {
    expect(
      findFinishingBlows(battle(["101=100;102=0;+dmg=100;-dmg=100"])),
    ).toEqual([]);
  });

  it("credits a revived warrior's second death again", () => {
    expect(
      findFinishingBlows(
        battle([
          "101=100;201=0;+dmg=900;-dmg=900",
          "202=100;201=30;heal_target=30",
          "102=100;201=0;+dmg=400;-dmg=400",
        ]),
      ),
    ).toEqual([
      { killerId: "101", victimId: "201", moveIndex: 0 },
      { killerId: "102", victimId: "201", moveIndex: 2 },
    ]);
  });
});
