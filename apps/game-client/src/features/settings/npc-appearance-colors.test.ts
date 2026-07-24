import {
  COMBAT_NPC_TYPES,
  DEFAULT_NPC_TYPE_COLORS,
  deriveNpcSurfaceColors,
  normalizeNpcTypeColors,
  SETTINGS_CATALOG,
} from "@lootlog/types";
import { describe, expect, it } from "vitest";

describe("NPC appearance colors", () => {
  it("provides a valid USER-scoped default for every combat NPC type", () => {
    expect(COMBAT_NPC_TYPES).toEqual([
      "ELITE",
      "ELITE2",
      "ELITE3",
      "HERO",
      "EVENT_HERO",
      "COLOSSUS",
      "TITAN",
    ]);

    for (const npcType of COMBAT_NPC_TYPES) {
      expect(DEFAULT_NPC_TYPE_COLORS[npcType]).toMatch(/^#[0-9A-F]{6}$/);
      expect(
        SETTINGS_CATALOG.appearance.fields[`npcColors.${npcType}`],
      ).toMatchObject({
        defaultValue: DEFAULT_NPC_TYPE_COLORS[npcType],
        scopes: ["USER"],
      });
    }
    expect(SETTINGS_CATALOG.appearance.schemaVersion).toBe(2);
  });

  it("normalizes malformed values per type instead of rejecting the palette", () => {
    expect(
      normalizeNpcTypeColors({
        HERO: "#00ff00",
        TITAN: "invalid",
      }),
    ).toEqual({
      ...DEFAULT_NPC_TYPE_COLORS,
      HERO: "#00FF00",
    });
  });

  it("derives a readable text, raw border and translucent background", () => {
    const colors = deriveNpcSurfaceColors("#194894");

    expect(colors.border).toBe("#194894");
    expect(colors.background).toBe("rgba(25, 72, 148, 0.4)");
    expect(colors.text).toMatch(/^#[0-9A-F]{6}$/);
    expect(colors.text).not.toBe("#194894");
  });
});
