import { expect, it } from "vitest";
import {
  createBattleFilterHandlers,
  toggleBattleSearchWarrior,
  type BattleFilters,
} from "./battle-filter-handlers";

it("removes empty multi-value filters while preserving unrelated selections", () => {
  let next: BattleFilters = {};
  const filters: BattleFilters = {
    characterId: ["hero"],
    world: "world",
    minLevel: 50,
    result: ["won"],
  };
  createBattleFilterHandlers(filters, (value) => {
    next = value;
  }).handleCharacterChange("hero");
  expect(next).toEqual({ ...filters, characterId: undefined });
  createBattleFilterHandlers(filters, (value) => {
    next = value;
  }).handleResultChange("lost");
  expect(next.result).toEqual(["won", "lost"]);
  expect(filters.result).toEqual(["won"]);
});

it("toggles warriors by name without dropping other selections", () => {
  const selected = [
    { name: "first", id: 1 },
    { name: "second", id: 2 },
  ];
  expect(toggleBattleSearchWarrior(selected, { name: "first", id: 3 })).toEqual(
    [{ name: "second", id: 2 }],
  );
  expect(selected).toHaveLength(2);
});
