import { describe, expect, it } from "vitest";
import {
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
