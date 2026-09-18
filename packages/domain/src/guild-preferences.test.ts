import { describe, expect, it } from "bun:test";
import { filterGuildsByVisibility, orderGuilds } from "./guild-preferences.js";

const alpha = { id: "guild-1", name: "Alpha" };

const beta = { id: "guild-2", name: "Beta" };

const gamma = { id: "guild-3", name: "Gamma" };

const guilds = [alpha, beta, gamma];

describe("server visibility", () => {
  it("orders known guilds and appends newly available guilds", () => {
    expect(orderGuilds(guilds, ["guild-2", "missing", "guild-1"])).toEqual([
      beta,
      alpha,
      gamma,
    ]);
  });

  it("filters by visibility and name without mutating the ordered list", () => {
    const orderedGuilds = orderGuilds(guilds, ["guild-2"]);

    expect(
      filterGuildsByVisibility(orderedGuilds, ["guild-2"], "hidden", " BETA "),
    ).toEqual([beta]);
    expect(orderedGuilds).toHaveLength(3);
  });
});
