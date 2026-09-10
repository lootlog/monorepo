import { describe, expect, it } from "vitest";
import {
  normalizeSoundSettings,
  normalizeTimerNpc,
  getGuildIds,
  getGuildNamesById,
  type GuildIdentity,
} from "./generated-helpers";

const guilds: GuildIdentity[] = [
  { id: "guild-1", name: "Alpha", icon: null },
  { id: "guild-2", name: "Beta", icon: null },
];

describe("generated API helpers", () => {
  it("reuses guild projections while query data is unchanged", () => {
    const firstIds = getGuildIds(guilds);
    const firstNames = getGuildNamesById(guilds);

    expect(getGuildIds(guilds)).toBe(firstIds);
    expect(getGuildNamesById(guilds)).toBe(firstNames);
    expect(firstIds).toEqual(["guild-1", "guild-2"]);
    expect(firstNames).toEqual({ "guild-1": "Alpha", "guild-2": "Beta" });
  });

  it("does not reuse projections for changed query data", () => {
    const nextGuilds = guilds.map((guild) => ({ ...guild }));

    expect(getGuildIds(nextGuilds)).not.toBe(getGuildIds(guilds));
    expect(getGuildNamesById(nextGuilds)).not.toBe(getGuildNamesById(guilds));
  });

  it("reuses empty projections when query data is unavailable", () => {
    expect(getGuildIds()).toBe(getGuildIds());
    expect(getGuildNamesById()).toBe(getGuildNamesById());
  });
});

describe("generated response normalization", () => {
  it("converts timer numeric strings and retains nullable icon fallback", () => {
    expect(
      normalizeTimerNpc({
        id: 7,
        name: "Dragon",
        lvl: 20,
        prof: "w",
        wt: "12.5",
        margonemType: "invalid",
        type: "ELITE",
        icon: null,
        location: "Cave",
      }),
    ).toEqual({
      id: 7,
      name: "Dragon",
      lvl: 20,
      prof: "w",
      wt: 12.5,
      margonemType: 0,
      type: "ELITE",
      icon: "",
      location: "Cave",
    });
  });

  it("normalizes legacy sound JSON without treating malformed entries as settings", () => {
    const result = normalizeSoundSettings({
      userId: "user-1",
      masterVolume: 1,
      notificationsVolume: 1,
      detectorVolume: 1,
      timersVolume: 1,
      pingsVolume: 1,
      notificationsConfig: {
        HERO: { volume: "0.25", soundUrl: "custom.mp3" },
        TITAN: { volume: "invalid", soundUrl: false },
        ELITE: null,
        ELITE2: [],
      },
      detectorConfig: false,
      timersConfig: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-02T00:00:00Z",
    });

    expect(result.notificationsConfig).toEqual({
      HERO: { volume: 0.25, soundUrl: "custom.mp3" },
      TITAN: { volume: 0.5, soundUrl: "" },
    });
    expect(result.detectorConfig).toEqual({});
    expect(result.timersConfig).toEqual({});
    expect(result.createdAt).toEqual(new Date("2026-01-01T00:00:00Z"));
  });
});
