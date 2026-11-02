import { describe, expect, it } from "bun:test";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import {
  compareNpcsStrongestFirst,
  getNpcType,
  type NpcClassification,
  type NpcStrength,
} from "./npc-type.js";

describe("event hero classification", () => {
  it.each<[string, NpcClassification]>([
    ["the template flag", { wt: 82, icon: "her/x.gif", isHeroFromEvent: true }],
    ["an event graphic", { wt: 82, icon: "hev/h26-h4-nosferatu.gif" }],
    [
      "a rendered event graphic URL",
      {
        wt: 87,
        icon: "https://micc.garmory-cdn.cloud/obrazki/npc/hev/g25-h5-anielica.gif",
      },
    ],
  ])("makes a hero from %s an event hero", (_, npc) => {
    expect(getNpcType(NpcTypeEnum, { prof: "h", type: 2, ...npc })).toBe(
      NpcTypeEnum.EVENT_HERO,
    );
  });

  it.each<[string, NpcClassification, NpcTypeEnum]>([
    ["a regular hero", { wt: 80, icon: "her/zly-przewodnik.gif" }, "HERO"],
    [
      "an event colossus",
      { wt: 92, icon: "hev/w20-pir-heros1b.gif" },
      "COLOSSUS",
    ],
    ["an event elite", { wt: 10, icon: "hev/gorhar-prastary.gif" }, "ELITE"],
    [
      "a flagged colossus",
      { wt: 90, icon: "hev/wiel21-shuck.gif", isHeroFromEvent: true },
      "COLOSSUS",
    ],
  ])("keeps %s in its weight tier", (_, npc, expected) => {
    expect(getNpcType(NpcTypeEnum, { prof: "h", type: 2, ...npc })).toBe(
      expected,
    );
  });
});

describe("Hero Tracker classification", () => {
  it.each([
    "Tropiciel Herosów",
    "Wtajemniczony Tropiciel Herosów",
    "Doświadczony Tropiciel Herosów",
    "Hero Hunter",
    "Initiated Hero Hunter",
    "Experienced Hero Hunter",
  ])("classifies %s, whose template has no weight, as a tracker", (name) => {
    expect(getNpcType(NpcTypeEnum, { wt: 0, name })).toBe(
      NpcTypeEnum.HERO_TRACKER,
    );
  });

  it("keeps the Tuzmer NPC Tropicielka Albiona an ordinary NPC", () => {
    expect(
      getNpcType(NpcTypeEnum, { wt: 0, type: 0, name: "Tropicielka Albiona" }),
    ).toBe(NpcTypeEnum.NPC);
  });
});

describe("strongest NPC of a fight", () => {
  const strongest = (npcs: NpcStrength[]) =>
    [...npcs].sort(compareNpcsStrongestFirst)[0]?.npcId;

  it("names the boss, never an escort of a higher level", () => {
    expect(
      strongest([
        { type: "ELITE", wt: 15, lvl: 70, npcId: 2 },
        { type: "ELITE2", wt: 25, lvl: 50, npcId: 1 },
      ]),
    ).toBe(1);
  });

  it("ranks a hero above an event hero of the same weight", () => {
    expect(
      strongest([
        { type: "EVENT_HERO", wt: 85, lvl: 120, npcId: 2 },
        { type: "HERO", wt: 85, lvl: 100, npcId: 1 },
      ]),
    ).toBe(1);
  });

  it("ranks a monster above a heavier NPC that is not one", () => {
    expect(
      strongest([
        { type: "NPC", wt: 100, lvl: 100, npcId: 2 },
        { type: "ELITE", wt: 12, lvl: 30, npcId: 1 },
      ]),
    ).toBe(1);
  });

  it("picks the same one of identical monsters in any order", () => {
    const twin = { type: "ELITE2", wt: 25, lvl: 50 } as const;

    expect(
      strongest([
        { ...twin, npcId: 9 },
        { ...twin, npcId: 3 },
      ]),
    ).toBe(3);
    expect(
      strongest([
        { ...twin, npcId: 3 },
        { ...twin, npcId: 9 },
      ]),
    ).toBe(3);
  });
});
