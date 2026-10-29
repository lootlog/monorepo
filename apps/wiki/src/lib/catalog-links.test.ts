import { describe, expect, it } from "vitest";
import { readPageSegment } from "./catalog-links";

describe("catalog page URLs", () => {
  it("reads the id from a slugged segment and from an old id-only link", () => {
    expect(readPageSegment("257037-barbatos-smoczy-straznik")).toEqual({
      id: 257037,
      slug: "barbatos-smoczy-straznik",
    });
    expect(readPageSegment("32143")).toEqual({ id: 32143, slug: "" });
    expect(readPageSegment("barbatos")).toBeUndefined();
  });
});
