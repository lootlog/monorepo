import {
  parseCommaSeparatedQuery,
  parseCommaSeparatedSearchQuery,
} from "./query-helpers";

describe("query helpers", () => {
  describe("parseCommaSeparatedQuery", () => {
    it("splits comma-separated strings into trimmed values", () => {
      expect(parseCommaSeparatedQuery("tanroth, hero, , titan")).toEqual([
        "tanroth",
        "hero",
        "titan",
      ]);
    });

    it("passes non-string values through unchanged", () => {
      const queryValues = ["1", "2"];

      expect(parseCommaSeparatedQuery(queryValues)).toBe(queryValues);
      expect(parseCommaSeparatedQuery(undefined)).toBeUndefined();
    });
  });

  describe("parseCommaSeparatedSearchQuery", () => {
    it("keeps plain search strings unchanged", () => {
      expect(parseCommaSeparatedSearchQuery("tanroth")).toBe("tanroth");
    });

    it("splits comma-separated search strings", () => {
      expect(parseCommaSeparatedSearchQuery("tanroth, hero")).toEqual([
        "tanroth",
        "hero",
      ]);
    });
  });
});
