import { expect, test } from "bun:test";
import { parseSampleBattle } from "./battles-generator.js";

test("sample battle parsing retains moves, warriors and extension fields", () => {
  const sample = {
    accountId: "account",
    characterId: "character",
    world: "world",
    events: [
      {
        ev: 1,
        f: {
          m: ["move"],
          w: {
            "1": {
              originalId: 1,
              name: "Hero",
              lvl: 100,
              prof: "w",
              icon: "hero.gif",
              team: 1,
            },
          },
        },
        extension: "kept",
      },
    ],
  };
  expect(parseSampleBattle(JSON.stringify(sample))).toEqual(sample);
  expect(() =>
    parseSampleBattle(
      JSON.stringify({ ...sample, events: [{ f: { m: [42] } }] }),
    ),
  ).toThrow();
  expect(() =>
    parseSampleBattle(
      JSON.stringify({ ...sample, events: [{ f: { w: { "1": {} } } }] }),
    ),
  ).toThrow();
});
