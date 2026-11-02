import { describe, expect, it } from "bun:test";
import { NpcTypeEnum } from "@lootlog/schema/npc-type";
import { getNpcType, type NpcClassification } from "./npc-type.js";

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
