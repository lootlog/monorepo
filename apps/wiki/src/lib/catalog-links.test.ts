import { describe, expect, it } from "vitest";
import { catalogSlug, readPageSegment } from "./catalog-links";

describe("catalog page URLs", () => {
  it("keeps Polish letters readable instead of dropping them", () => {
    expect(catalogSlug("Łowczyni Wspomnień")).toBe("lowczyni-wspomnien");
    expect(catalogSlug("Żmij Ćwierćgłowy")).toBe("zmij-cwiercglowy");
  });

  it("reads the id from a slugged segment and from an old id-only link", () => {
    expect(readPageSegment("257037-barbatos-smoczy-straznik")).toEqual({
      id: 257037,
      slug: "barbatos-smoczy-straznik",
    });
    expect(readPageSegment("32143")).toEqual({ id: 32143, slug: "" });
    expect(readPageSegment("barbatos")).toBeUndefined();
  });
});
