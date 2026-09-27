import { describe, expect, it } from "bun:test";
import { sortGuildsByPreference } from "./guild-order.js";

describe("guild preference ordering", () => {
  it("keeps newly available organizations after saved ones and ignores stale preferences", () => {
    const guilds = [
      { id: "new-b" },
      { id: "first" },
      { id: "new-a" },
      { id: "second" },
    ];

    const original = [...guilds];

    const result = sortGuildsByPreference(guilds, [
      "second",
      "missing",
      "first",
    ]);

    expect(result.map(({ id }) => id)).toEqual([
      "second",
      "first",
      "new-b",
      "new-a",
    ]);
    expect(guilds).toEqual(original);
  });

  it("does not duplicate organizations when a saved preference repeats an ID", () => {
    const guilds = [{ id: "first" }, { id: "second" }];

    expect(
      sortGuildsByPreference(guilds, ["first", "second", "first"]),
    ).toEqual([{ id: "second" }, { id: "first" }]);
  });
});
