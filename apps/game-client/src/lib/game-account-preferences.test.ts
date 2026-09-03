import { defaultDetectorSettings } from "@lootlog/schema/account-preferences";
import {
  getEffectiveDetectorSettings,
  resolveDetectorGuildIds,
} from "@/lib/game-account-preferences";

describe("game account preferences helpers", () => {
  it("returns default detector settings when preferences are missing", () => {
    expect(getEffectiveDetectorSettings()).toEqual(defaultDetectorSettings);
  });

  it("resolves guild ids from all matching routing rules without duplicates", () => {
    const guildIds = resolveDetectorGuildIds(
      [
        {
          id: "rule-1",
          minLevel: 100,
          maxLevel: 200,
          guildIds: ["guild-1", "guild-2"],
        },
        {
          id: "rule-2",
          minLevel: 150,
          maxLevel: 220,
          guildIds: ["guild-2", "guild-3"],
        },
        {
          id: "rule-3",
          minLevel: 250,
          maxLevel: 300,
          guildIds: ["guild-4"],
        },
      ],
      175,
    );

    expect(guildIds).toEqual(["guild-1", "guild-2", "guild-3"]);
  });

  it("returns an empty list when no routing rule matches npc level", () => {
    const guildIds = resolveDetectorGuildIds(
      [
        {
          id: "rule-1",
          minLevel: 100,
          maxLevel: 149,
          guildIds: ["guild-1"],
        },
      ],
      200,
    );

    expect(guildIds).toEqual([]);
  });

  it("matches routing rules by world case-insensitively", () => {
    const guildIds = resolveDetectorGuildIds(
      [
        {
          id: "rule-1",
          minLevel: 100,
          maxLevel: 200,
          world: "  Pandora ",
          guildIds: ["guild-1"],
        },
        {
          id: "rule-2",
          minLevel: 100,
          maxLevel: 200,
          world: "fobos",
          guildIds: ["guild-2"],
        },
      ],
      175,
      "pandora",
    );

    expect(guildIds).toEqual(["guild-1"]);
  });

  it("treats blank world as an unset filter", () => {
    const guildIds = resolveDetectorGuildIds(
      [
        {
          id: "rule-1",
          minLevel: 100,
          maxLevel: 200,
          world: "   ",
          guildIds: ["guild-1"],
        },
      ],
      175,
      "tempest",
    );

    expect(guildIds).toEqual(["guild-1"]);
  });
});
