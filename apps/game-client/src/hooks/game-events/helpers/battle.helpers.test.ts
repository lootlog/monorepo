import type { W } from "@lootlog/margonem/game-events";
import { describe, expect, it } from "vitest";
import type { BattleWarriorsWithAccountId } from "@/store/game-store/battle.store";
import { mergeBattleWarriorPatches } from "./battle.helpers";

const createWarrior = (
  id: number,
  name: string,
  team: number,
): BattleWarriorsWithAccountId[string] => ({
  accountId: id > 0 ? id * 10 : undefined,
  hpp: 100,
  icon: `${name}.gif`,
  id,
  lvl: 300,
  name,
  originalId: Math.abs(id),
  prof: "w",
  team,
  type: id < 0 ? 2 : 0,
  wt: id < 0 ? 85 : 0,
});

describe("mergeBattleWarriorPatches", () => {
  it("preserves complete participants while applying fragmentary updates", () => {
    const currentWarriors = {
      "101": createWarrior(101, "Hero", 1),
      "102": createWarrior(102, "Ally", 1),
      "-501": createWarrior(-501, "Boss", 2),
    };
    const patches = {
      "101": { hpp: 75 },
      "-501": { hpp: 0 },
    } as unknown as W;

    const mergedWarriors = mergeBattleWarriorPatches(patches, currentWarriors);

    expect(mergedWarriors).toEqual({
      "101": { ...currentWarriors["101"], hpp: 75 },
      "102": currentWarriors["102"],
      "-501": { ...currentWarriors["-501"], hpp: 0 },
    });
    expect(currentWarriors["101"].hpp).toBe(100);
    expect(currentWarriors["-501"].hpp).toBe(100);
  });
});
