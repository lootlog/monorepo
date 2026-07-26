import { describe, expect, it } from "vitest";
import type { GuildIdentity } from "@/lib/api/generated-helpers";
import {
  getVisibleLootlogGuilds,
  orderLootlogGuilds,
} from "./selected-lootlog-guild";

const guilds: GuildIdentity[] = [
  { id: "guild-1", name: "Alpha", icon: null },
  { id: "guild-2", name: "Beta", icon: null },
  { id: "guild-3", name: "Gamma", icon: null },
];

describe("Lootlog guild visibility", () => {
  it("orders known guilds first and appends newly available guilds", () => {
    expect(
      orderLootlogGuilds(guilds, [
        "guild-2",
        "guild-unavailable",
        "guild-1",
      ]).map((guild) => guild.id),
    ).toEqual(["guild-2", "guild-1", "guild-3"]);
  });

  it("removes hidden guilds after applying the saved order", () => {
    expect(
      getVisibleLootlogGuilds(
        guilds,
        ["guild-2", "guild-1"],
        ["guild-2", "guild-unavailable"],
      ).map((guild) => guild.id),
    ).toEqual(["guild-1", "guild-3"]);
  });

  it("keeps newly available guilds visible by default", () => {
    expect(
      getVisibleLootlogGuilds(guilds, ["guild-1"], []).map((guild) => guild.id),
    ).toEqual(["guild-1", "guild-2", "guild-3"]);
  });
});
