import { describe, expect, it } from "vitest";
import { catalogUpstreamUrl } from "./catalog-upstream";

const BASE_URL = "https://catalog.example/";

describe("catalog reads through the Worker", () => {
  it("asks the catalog the same question however a browser orders or pads it, so a junk parameter cannot bypass the edge cache", () => {
    const asked = [
      "?gameVersion=pl&limit=1&ids=257636",
      "?ids=257636&cache-buster=8f1c&gameVersion=pl&limit=1",
    ].map(
      (search) => catalogUpstreamUrl(BASE_URL, "catalog/items", search)?.href,
    );

    expect(asked).toEqual([
      "https://catalog.example/catalog/items?gameVersion=pl&ids=257636&limit=1",
      "https://catalog.example/catalog/items?gameVersion=pl&ids=257636&limit=1",
    ]);
  });

  it("reaches no catalog path the wiki does not read", () => {
    expect(catalogUpstreamUrl(BASE_URL, "items", "")).toBeUndefined();
    expect(catalogUpstreamUrl(BASE_URL, "healthz", "")).toBeUndefined();
  });
});
