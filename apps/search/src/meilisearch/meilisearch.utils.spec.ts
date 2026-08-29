import {
  buildMeilisearchSearchTermFilter,
  buildMeilisearchStringInFilter,
  getMeilisearchErrorCode,
} from "./meilisearch.utils.js";

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

describe("buildMeilisearchStringInFilter", () => {
  it("formats string values for a Meilisearch IN filter", () => {
    expect(buildMeilisearchStringInFilter("name", ["Hero", "Villain"])).toBe(
      'name IN ["Hero", "Villain"]',
    );
  });

  it("quotes values using JSON string escaping", () => {
    expect(buildMeilisearchStringInFilter("name", ['Hero "The One"'])).toBe(
      'name IN ["Hero \\"The One\\""]',
    );
  });
});

describe("buildMeilisearchSearchTermFilter", () => {
  it("uses the search string as the Meilisearch term", () => {
    expect(buildMeilisearchSearchTermFilter("name", "Hero")).toEqual({
      searchTerm: "Hero",
    });
  });

  it("uses an IN filter for multiple exact search values", () => {
    expect(
      buildMeilisearchSearchTermFilter("name", ["Hero", "Villain"]),
    ).toEqual({
      searchTerm: "",
      filter: 'name IN ["Hero", "Villain"]',
    });
  });

  it("uses an empty search term when search is omitted", () => {
    expect(buildMeilisearchSearchTermFilter("name", undefined)).toEqual({
      searchTerm: "",
    });
  });
});
