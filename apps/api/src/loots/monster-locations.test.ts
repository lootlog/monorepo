import { expect, test } from "bun:test";
import { toMonsterLocations } from "./monster-locations.js";

const fights = (map: string, count: number) => ({
  gameVersion: "pl",
  name: "Złoty Roger",
  type: "COLOSSUS",
  map,
  fights: count,
});

test("leaves out the maps players only carry a monster's loot to", () => {
  // Złoty Roger's latest fights: his lair, Tuzmer after the teleport out, and
  // a stray loot from a map players pass through.
  expect(
    toMonsterLocations([
      fights("Tuzmer", 23),
      fights("Kryjówka Złotego Rogera", 972),
      fights("Ruchome Piaski", 5),
    ]),
  ).toEqual([
    {
      gameVersion: "pl",
      name: "Złoty Roger",
      type: "COLOSSUS",
      locations: [
        { map: "Kryjówka Złotego Rogera", share: 0.97 },
        { map: "Tuzmer", share: 0.02 },
      ],
    },
  ]);
});

test("lists each monster of an edition, name and type apart", () => {
  const monsters = toMonsterLocations([
    fights("Kryjówka Złotego Rogera", 10),
    { ...fights("Ruchome Piaski", 10), type: "HERO" },
    { ...fights("Shifting Sands", 10), gameVersion: "en", type: "HERO" },
  ]);

  expect(
    monsters.map(({ gameVersion, type, locations }) => [
      gameVersion,
      type,
      locations,
    ]),
  ).toEqual([
    ["pl", "COLOSSUS", [{ map: "Kryjówka Złotego Rogera", share: 1 }]],
    ["pl", "HERO", [{ map: "Ruchome Piaski", share: 1 }]],
    ["en", "HERO", [{ map: "Shifting Sands", share: 1 }]],
  ]);
});
