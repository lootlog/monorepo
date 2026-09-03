import { describe, expect, it } from "bun:test";
import { Result, Schema } from "effect";
import {
  CreateBattleSchema,
  WarriorsRecordSchema,
} from "#src/battles/submission/create-battle";

describe("WarriorsRecordSchema", () => {
  it("should accept valid warriors record with two teams", () => {
    const result = Schema.decodeUnknownResult(WarriorsRecordSchema)({
      "1": {
        originalId: 101,
        name: "Warrior1",
        lvl: 50,
        prof: "w",
        icon: "icon1",
        team: 1,
      },
      "2": {
        originalId: 102,
        name: "Warrior2",
        lvl: 45,
        prof: "p",
        icon: "icon2",
        team: 2,
      },
    });

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("should reject warriors record with only one team", () => {
    const result = Schema.decodeUnknownResult(WarriorsRecordSchema)({
      "1": {
        originalId: 101,
        name: "Warrior1",
        lvl: 50,
        prof: "w",
        icon: "icon1",
        team: 1,
      },
      "2": {
        originalId: 102,
        name: "Warrior2",
        lvl: 45,
        prof: "p",
        icon: "icon2",
        team: 1,
      },
    });

    expect(Result.isFailure(result)).toBe(true);
  });

  it("should reject NPC warriors (negative IDs)", () => {
    const result = Schema.decodeUnknownResult(WarriorsRecordSchema)({
      "-1": {
        originalId: -101,
        name: "NPC",
        lvl: 50,
        prof: "w",
        icon: "icon1",
        team: 1,
      },
      "2": {
        originalId: 102,
        name: "Warrior2",
        lvl: 45,
        prof: "p",
        icon: "icon2",
        team: 2,
      },
    });

    expect(Result.isFailure(result)).toBe(true);
  });

  it("should reject invalid warrior data", () => {
    const result = Schema.decodeUnknownResult(WarriorsRecordSchema)({
      "1": {
        originalId: 101,
        name: "Warrior1",
        lvl: 50,
        prof: "w",
        icon: "icon1",
        team: 1,
      },
      "2": {
        originalId: 102,
        name: 123,
        lvl: 45,
        prof: "p",
        icon: "icon2",
        team: 2,
      },
    });

    expect(Result.isFailure(result)).toBe(true);
  });

  it("should reject non-object values", () => {
    const result =
      Schema.decodeUnknownResult(WarriorsRecordSchema)("not an object");

    expect(Result.isFailure(result)).toBe(true);
  });

  it("should accept warriors from different teams", () => {
    const result = Schema.decodeUnknownResult(WarriorsRecordSchema)({
      "1": {
        originalId: 101,
        name: "Warrior1",
        lvl: 50,
        prof: "w",
        icon: "icon1",
        team: 1,
      },
      "2": {
        originalId: 102,
        name: "Warrior2",
        lvl: 45,
        prof: "p",
        icon: "icon2",
        team: 1,
      },
      "3": {
        originalId: 103,
        name: "Warrior3",
        lvl: 48,
        prof: "m",
        icon: "icon3",
        team: 2,
      },
    });

    expect(Result.isSuccess(result)).toBe(true);
  });

  it("should reject empty warriors record", () => {
    const result = Schema.decodeUnknownResult(WarriorsRecordSchema)({});

    expect(Result.isFailure(result)).toBe(true);
  });

  it("should drop incomplete warrior snapshots from battle events", () => {
    const result = Schema.decodeUnknownResult(CreateBattleSchema)({
      accountId: "9822301",
      characterId: "617",
      world: "gordion",
      events: [
        {
          ev: 1,
          f: {
            w: {
              "52785": {
                originalId: 52785,
                name: "Warrior1",
                lvl: 85,
                prof: "w",
                icon: "icon1",
                team: 1,
              },
              "161562": {
                originalId: 161562,
                name: "Warrior2",
                lvl: 83,
                prof: "p",
                icon: "icon2",
                team: 2,
              },
            },
          },
        },
        {
          ev: 2,
          f: {
            m: ["52785=100;161562=90;+dmg=10"],
            w: {
              "52785": {},
              "161562": { hpp: 90 },
            },
          },
        },
      ],
    });

    expect(Result.isSuccess(result)).toBe(true);
    if (Result.isFailure(result)) return;

    expect(result.success.events[1]?.f.w).toBeUndefined();
  });
});
