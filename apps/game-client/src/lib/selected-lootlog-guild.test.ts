import { orderGuilds as orderLootlogGuilds } from "@lootlog/domain/guild-preferences";
import { describe, expect, it } from "vitest";
import type { GuildIdentity } from "@/lib/api/generated-helpers";
import {
  getVisibleLootlogGuilds,
  resolveGuildTargets,
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

describe("Lootlog message targets", () => {
  it("drops stored targets the player has since hidden or lost", () => {
    expect(
      resolveGuildTargets({
        selectedGuildIds: ["guild-3", "guild-hidden", "guild-1"],
        visibleGuilds: guilds,
        fallbackGuildId: "guild-2",
      }),
    ).toEqual(["guild-1", "guild-3"]);
  });

  it("targets the character's Lootlog when no stored target is visible", () => {
    expect(
      resolveGuildTargets({
        selectedGuildIds: ["guild-hidden"],
        visibleGuilds: guilds,
        fallbackGuildId: "guild-2",
      }),
    ).toEqual(["guild-2"]);
  });
});
