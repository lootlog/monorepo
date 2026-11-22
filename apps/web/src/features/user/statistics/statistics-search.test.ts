import { describe, expect, it } from "vitest";
import { parseStatisticsSearch } from "./statistics-search";

describe("statistics URL", () => {
  it("defaults malformed filters and preserves valid reload state", () => {
    expect(
      parseStatisticsSearch({ days: "bogus", tab: "bad", world: 12 }),
    ).toEqual({ days: 30, tab: "overview", world: undefined });
    expect(
      parseStatisticsSearch({
        days: "90",
        tab: "monsters",
        world: " luvia ",
        characterId: " 123 ",
      }),
    ).toEqual({
      days: 90,
      tab: "monsters",
      world: "luvia",
      characterId: "123",
    });
    expect(
      parseStatisticsSearch({ characterId: "123" }).characterId,
    ).toBeUndefined();
  });
});
