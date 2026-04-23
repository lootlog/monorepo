import { getMeilisearchErrorCode } from "./meilisearch.utils";

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
    expect(getMeilisearchErrorCode(null)).toBeNull();
  });
});
