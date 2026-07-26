import { describe, expect, it } from "vitest";
import { filterGuildsByVisibility, orderGuilds } from "./server-visibility";

const guilds = [
  { id: "guild-1", name: "Alpha" },
  { id: "guild-2", name: "Beta" },
  { id: "guild-3", name: "Gamma" },
];

describe("server visibility", () => {
  it("orders known guilds and appends newly available guilds", () => {
    expect(orderGuilds(guilds, ["guild-2", "missing", "guild-1"])).toEqual([
      guilds[1],
      guilds[0],
      guilds[2],
    ]);
  });

  it("filters by visibility and name without mutating the ordered list", () => {
    const orderedGuilds = orderGuilds(guilds, ["guild-2"]);

    expect(
      filterGuildsByVisibility(orderedGuilds, ["guild-2"], "hidden", "beta"),
    ).toEqual([guilds[1]]);
    expect(orderedGuilds).toHaveLength(3);
  });
});
