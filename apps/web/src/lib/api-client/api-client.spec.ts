import { describe, expect, it } from "vitest";
import { buildRequestUrl } from "./api-client";

describe("buildRequestUrl", () => {
  it("keeps the API base path for paths starting with a slash", () => {
    const url = buildRequestUrl({
      baseURL: "http://localhost/api/lootlog",
      path: "/users/@me/preferences",
    });

    expect(url.toString()).toBe(
      "http://localhost/api/lootlog/users/@me/preferences",
    );
  });

  it("builds the same URL for paths without a leading slash", () => {
    const url = buildRequestUrl({
      baseURL: "http://localhost/api/lootlog",
      path: "users/@me/preferences",
    });

    expect(url.toString()).toBe(
      "http://localhost/api/lootlog/users/@me/preferences",
    );
  });

  it("keeps other service prefixes intact", () => {
    const url = buildRequestUrl({
      baseURL: "http://localhost/api/battlelog",
      path: "/battles",
    });

    expect(url.toString()).toBe("http://localhost/api/battlelog/battles");
  });

  it("serializes params without introducing duplicate slashes", () => {
    const url = buildRequestUrl({
      baseURL: "http://localhost/api/lootlog/",
      path: "/users/@me/preferences",
      params: {
        include: ["theme", "colorMode"],
        page: 2,
        search: null,
      },
    });

    expect(url.toString()).toBe(
      "http://localhost/api/lootlog/users/@me/preferences?include=theme&include=colorMode&page=2",
    );
  });
});
