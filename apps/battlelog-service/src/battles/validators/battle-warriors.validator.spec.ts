import {
  CreateBattleSchema,
  WarriorsRecordSchema,
} from "../dto/create-battle.dto";

describe("WarriorsRecordSchema", () => {
  it("should accept valid warriors record with two teams", () => {
    const result = WarriorsRecordSchema.safeParse({
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

    expect(result.success).toBe(true);
  });

  it("should reject warriors record with only one team", () => {
    const result = WarriorsRecordSchema.safeParse({
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

    expect(result.success).toBe(false);
  });

  it("should reject NPC warriors (negative IDs)", () => {
    const result = WarriorsRecordSchema.safeParse({
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

    expect(result.success).toBe(false);
  });

  it("should reject invalid warrior data", () => {
    const result = WarriorsRecordSchema.safeParse({
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

    expect(result.success).toBe(false);
  });

  it("should reject non-object values", () => {
    const result = WarriorsRecordSchema.safeParse("not an object");

    expect(result.success).toBe(false);
  });

  it("should accept warriors from different teams", () => {
    const result = WarriorsRecordSchema.safeParse({
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

    expect(result.success).toBe(true);
  });

  it("should reject empty warriors record", () => {
    const result = WarriorsRecordSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("should drop incomplete warrior snapshots from battle events", () => {
    const result = CreateBattleSchema.safeParse({
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

    expect(result.success).toBe(true);
    if (!result.success) return;

    expect(result.data.events[1]?.f.w).toBeUndefined();
  });
});
