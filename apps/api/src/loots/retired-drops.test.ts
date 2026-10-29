import { expect, test } from "bun:test";
import { isRetiredDrop } from "./retired-drops.js";

// Drop statistics of Chaegd Agnrakh and Czempion Furboli, whose reworks
// replaced their loot.
test("retires the drops a rework replaced", () => {
  // Klejnot królewski: about one drop in 190 kills, none in the last 14 823.
  expect(
    isRetiredDrop({ drops: 166, lastDropKill: 32_040, kills: 46_863 }),
  ).toBe(true);
  // Four early drops of a Furboli legendary before 22 900 kills without one.
  expect(isRetiredDrop({ drops: 4, lastDropKill: 25, kills: 22_977 })).toBe(
    true,
  );
});

test("keeps rare drops that still fall at their usual rate", () => {
  // Kryształ Chaegda Agnrakha: one drop in 173 kills, the last 64 kills ago.
  expect(
    isRetiredDrop({ drops: 271, lastDropKill: 46_799, kills: 46_863 }),
  ).toBe(false);
  // One drop in thousands of kills proves nothing about its rate.
  expect(isRetiredDrop({ drops: 1, lastDropKill: 9_000, kills: 22_977 })).toBe(
    false,
  );
});

test("does not retire a drop on a monster killed too rarely to tell", () => {
  expect(isRetiredDrop({ drops: 30, lastDropKill: 40, kills: 400 })).toBe(
    false,
  );
});
