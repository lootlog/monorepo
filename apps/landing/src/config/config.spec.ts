import { describe, expect, it } from "vitest";
import { createAuthCallbackUrl } from "./auth";

describe("public landing configuration", () => {
  it("preserves the Better Auth callback path", () => {
    expect(createAuthCallbackUrl("https://lootlog.pl")).toBe(
      "https://lootlog.pl/signin",
    );
  });
});
