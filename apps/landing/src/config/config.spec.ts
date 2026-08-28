import { describe, expect, it } from "vitest";
import { resolveAddonUrl } from "./addon";
import { createAuthCallbackUrl, resolveAuthServiceUrl } from "./auth";

describe("public landing configuration", () => {
  it("uses Vite-provided URLs without rewriting them", () => {
    expect(resolveAddonUrl("https://releases.example/addon")).toBe(
      "https://releases.example/addon",
    );
    expect(resolveAuthServiceUrl("https://auth.example")).toBe(
      "https://auth.example",
    );
  });

  it("keeps the local and release fallbacks", () => {
    expect(resolveAddonUrl()).toBe(
      "https://github.com/lootlog/monorepo/releases/latest",
    );
    expect(resolveAuthServiceUrl()).toBe("http://localhost:4000");
  });

  it("preserves the Better Auth callback path", () => {
    expect(createAuthCallbackUrl("https://lootlog.pl")).toBe(
      "https://lootlog.pl/@me",
    );
  });
});
