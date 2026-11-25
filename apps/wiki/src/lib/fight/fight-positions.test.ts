import { describe, expect, test } from "vitest";
import { fightBattleLog } from "./fight-battle-log";
import { simulateFight } from "./fight-simulator";
import type { FightEvent } from "./fight-events";
import type { Combatant } from "./fight-state";
import type { ActiveSkill, MasteryQueue } from "./fight-skills";
import { seededRandom } from "./fight-summary";
import { fighter } from "./fight.fixtures";

describe("positions", () => {
  const actionsOf = (
    mine: Partial<Combatant>,
    theirs: Partial<Combatant>,
    turns: number,
  ) => {
    const events: FightEvent[] = [];
    const tough = { hp: 10_000_000, physical: { min: 1, max: 1 } };

    simulateFight(
      {
        teams: [
          [fighter({ ...tough, ...mine })],
          [fighter({ ...tough, attackSpeed: 1, ...theirs })],
        ],
      },
      seededRandom(3),
      (event) => {
        events.push(event);
      },
    );

    return events
      .filter((event) => event.actor === 0 && event.kind !== "heal")
      .slice(0, turns)
      .map((event) => (event.kind === "skill" ? event.skill.name : event.kind));
  };

  test("walks a melee fighter one step to a wand and two to a bow before striking", () => {
    expect(actionsOf({ position: 1 }, { position: 2 }, 2)).toEqual([
      "step",
      "strike",
    ]);
    expect(actionsOf({ position: 1 }, { position: 3 }, 3)).toEqual([
      "step",
      "step",
      "strike",
    ]);
    expect(actionsOf({ position: 1 }, { position: 1 }, 1)).toEqual(["strike"]);
    expect(actionsOf({ position: 2 }, { position: 3 }, 1)).toEqual(["strike"]);
  });

  test("casts a skill on itself before stepping toward a distant enemy", () => {
    const shout: ActiveSkill = {
      id: 1,
      name: "okrzyk",
      resource: "energy",
      cost: 0,
      cooldown: 5,
      selfCast: true,
      attacks: false,
      logged: [],
      effects: new Map([["perdmg", { value: 10, turns: 3 }]]),
    };

    expect(
      actionsOf(
        { position: 1, mastery: { steps: [shout, "attack"], repeat: true } },
        { position: 2 },
        3,
      ),
    ).toEqual(["okrzyk", "step", "strike"]);
  });

  test("steps forward from the queue at most twice, even toward a melee enemy", () => {
    const queue: MasteryQueue = {
      steps: ["step", "step", "step", "attack"],
      repeat: true,
    };

    expect(
      actionsOf({ position: 1, mastery: queue }, { position: 1 }, 4),
    ).toEqual(["step", "step", "strike", "strike"]);
    expect(
      actionsOf({ position: 2, mastery: queue }, { position: 1 }, 1),
    ).toEqual(["strike"]);
  });

  test("logs a step forward as the game does", () => {
    const setup = {
      teams: [[fighter({ position: 1 })], [fighter({ position: 2 })]],
    };

    const events: FightEvent[] = [];

    const result = simulateFight(setup, seededRandom(3), (event) => {
      events.push(event);
    });

    expect(
      fightBattleLog(setup, events, result).payload.events[0]?.f?.m,
    ).toContain("1=100.00;0;step");
  });
});
