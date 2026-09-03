import { describe, expect, it } from "bun:test";
import {
  parseCommaSeparatedQueryList,
  parseSearchTermsQuery,
} from "./query-list.js";

describe("query list utils", () => {
  describe("parseCommaSeparatedQueryList", () => {
    it("splits and trims comma-separated strings", () => {
      expect(parseCommaSeparatedQueryList("1, 2,,3 ")).toEqual(["1", "2", "3"]);
    });

    it("preserves non-string values", () => {
      expect(parseCommaSeparatedQueryList(["1", "2"])).toEqual(["1", "2"]);
      expect(parseCommaSeparatedQueryList(undefined)).toBeUndefined();
    });
  });

  describe("parseSearchTermsQuery", () => {
    it("keeps single search terms as strings", () => {
      expect(parseSearchTermsQuery("tanroth")).toBe("tanroth");
    });

    it("splits comma-separated search terms", () => {
      expect(parseSearchTermsQuery("Tanroth, Mushita,,")).toEqual([
        "Tanroth",
        "Mushita",
      ]);
    });

    it("preserves non-string values", () => {
      expect(parseSearchTermsQuery(["Tanroth", "Mushita"])).toEqual([
        "Tanroth",
        "Mushita",
      ]);
    });
  });
});
