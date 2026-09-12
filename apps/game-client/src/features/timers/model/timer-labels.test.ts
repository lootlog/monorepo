import { describe, expect, it } from "vitest";
import { NpcType } from "@/api/npcs.api";
import { createTimerFixture } from "./timer-fixtures";
import {
  formatCharacterLabel,
  formatLevelSuffix,
  formatLevelTag,
  getTimerShortname,
} from "./timer-labels";

describe("timer-labels", () => {
  it("formats level tags and suffixes and omits them for level-zero NPCs", () => {
    expect(formatLevelTag({ lvl: 120, prof: "W" })).toBe("120w");
    expect(formatLevelSuffix({ lvl: 120, prof: "W" })).toBe(" (120w)");
    expect(formatLevelSuffix({ lvl: 0, prof: "W" })).toBe("");
    expect(formatCharacterLabel({ name: "Alice", lvl: 55, prof: "m" })).toBe(
      "Alice (55m)",
    );
    expect(formatCharacterLabel({ name: "Alice" })).toBe("Alice");
  });

  it("marks manual timers and keeps the NPC type for typed ones", () => {
    const hero = createTimerFixture();
    expect(getTimerShortname(hero)).toBe("[H]");
    expect(
      getTimerShortname({
        ...hero,
        npc: { ...hero.npc, margonemType: 999, type: NpcType.HERO },
      }),
    ).toBe("[M][H]");
  });
});
