import { describe, expect, it } from "vitest";
import { buildRequestUrl } from "./orval-fetch";

describe("buildRequestUrl", () => {
  it("preserves path segments from the base URL", () => {
    expect(buildRequestUrl("http://localhost/api/search", "/items")).toBe(
      "http://localhost/api/search/items",
    );
  });

  it("normalizes duplicate slashes between base URL and path", () => {
    expect(buildRequestUrl("http://localhost/api/search/", "/items")).toBe(
      "http://localhost/api/search/items",
    );
  });

  it("supports base URLs without a path prefix", () => {
    expect(buildRequestUrl("https://search.lootlog.pl", "/items")).toBe(
      "https://search.lootlog.pl/items",
    );
  });
});
