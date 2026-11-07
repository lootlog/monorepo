import { describe, expect, it } from "bun:test";
import {
  getExpectedSharedRolls,
  getKillLootRolls,
  getSharedDropChance,
} from "./loot-rolls.js";

const member = (lvl: number, prof = "w", alive = true) => ({
  prof,
  lvl,
  alive,
});

const partyOf = (size: number, lvl = 100) =>
  Array.from({ length: size }, () => member(lvl));

describe("Margonem loot rolls", () => {
  it("gives a full party of 10 five and a half rolls on average", () => {
    expect(getExpectedSharedRolls(10)).toBe(5.5);
    expect(getExpectedSharedRolls(1)).toBe(1);
    expect(getExpectedSharedRolls(19)).toBe(10);
  });

  it("rolls an elite II once per two survivors, not per member", () => {
    const party = [
      ...partyOf(6),
      ...partyOf(4).map((m) => ({ ...m, alive: false })),
    ];

    expect(
      getKillLootRolls({ npcType: "ELITE2", world: "tarhuna", party }).rolls,
    ).toBe(3.5);
  });

  it("rolls a hero once when the party's levels spread too far", () => {
    // On a public world a level 100 lets the party down to level 80.
    const party = [member(100), member(80), member(79)];

    expect(
      getKillLootRolls({ npcType: "HERO", world: "tarhuna", party }).rolls,
    ).toBe(1);
    expect(
      getKillLootRolls({
        npcType: "HERO",
        world: "tarhuna",
        party: party.slice(0, 2),
      }).rolls,
    ).toBe(1.5);
  });

  it("lets private worlds spread levels further", () => {
    const party = [member(100), member(79)];

    expect(
      getKillLootRolls({ npcType: "HERO", world: "nerthus", party }).rolls,
    ).toBe(1.5);
  });

  it("never checks a titan party's levels", () => {
    const party = [member(300), member(100)];

    expect(
      getKillLootRolls({ npcType: "TITAN", world: "tarhuna", party }).rolls,
    ).toBe(1.5);
  });

  it("rolls an elite III once however many survive", () => {
    expect(
      getKillLootRolls({
        npcType: "ELITE3",
        world: "tarhuna",
        party: partyOf(10),
      }).rolls,
    ).toBe(1);
  });

  it("gives no roll when the whole party died", () => {
    expect(
      getKillLootRolls({
        npcType: "ELITE2",
        world: "tarhuna",
        party: [member(100, "w", false)],
      }).rolls,
    ).toBe(0);
  });

  it("counts dead members by profession for personal colossus loot", () => {
    const party = [member(100, "w"), member(100, "w", false), member(100, "m")];

    expect(
      getKillLootRolls({ npcType: "COLOSSUS", world: "tarhuna", party })
        .members,
    ).toEqual({ w: 2, p: 0, b: 0, m: 1, t: 0, h: 0 });
  });

  it("gives a full party five or six chances at an item", () => {
    // 1 - (0.5 * 0.99^5 + 0.5 * 0.99^6)
    expect(getSharedDropChance(0.01, 10)).toBeCloseTo(0.05376, 5);
    expect(getSharedDropChance(0.01, 1)).toBeCloseTo(0.01, 10);
  });
});
