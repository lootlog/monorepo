import { describe, expect, it } from "bun:test";
import {
  buildMeilisearchInFilter,
  getMeilisearchErrorCode,
} from "./query-builder.js";

describe("getMeilisearchErrorCode", () => {
  it("returns the string code from the error cause", () => {
    expect(
      getMeilisearchErrorCode({
        cause: {
          code: "index_not_found",
        },
      }),
    ).toBe("index_not_found");
  });

  it("returns null when the cause code is missing or not a string", () => {
    expect(getMeilisearchErrorCode(new Error("boom"))).toBeNull();
    expect(getMeilisearchErrorCode({ cause: { code: 404 } })).toBeNull();
    expect(getMeilisearchErrorCode({ cause: null })).toBeNull();
    expect(getMeilisearchErrorCode("boom")).toBeNull();
    expect(getMeilisearchErrorCode(null)).toBeNull();
  });
});

describe("buildMeilisearchInFilter", () => {
  it("formats string values for a Meilisearch IN filter", () => {
    expect(buildMeilisearchInFilter("name", ["Hero", "Villain"])).toBe(
      'name IN ["Hero", "Villain"]',
    );
  });

  it("quotes values using JSON string escaping", () => {
    expect(buildMeilisearchInFilter("name", ['Hero "The One"'])).toBe(
      'name IN ["Hero \\"The One\\""]',
    );
  });
});
