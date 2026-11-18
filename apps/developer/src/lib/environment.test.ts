import { expect, test } from "bun:test";
import { getPortalEnvironment } from "./environment";
import { isApiKeyActive } from "./key-client";

test("only the production portal host reaches production services", () => {
  expect(getPortalEnvironment("developer.lootlog.pl")).toBe("production");
  expect(getPortalEnvironment("dev-developer.lootlog.pl")).toBe("development");
  expect(getPortalEnvironment("preview.example.com")).toBe("development");
});

test("expired keys do not consume the UI limit of active keys", () => {
  const now = Date.parse("2026-09-08T12:00:00.000Z");

  const keys = [
    ...Array.from({ length: 10 }, () => ({
      expiresAt: "2026-09-08T12:00:00.000Z",
    })),
    { expiresAt: null },
    { expiresAt: "2026-09-09T12:00:00.000Z" },
  ];

  expect(keys.filter((key) => isApiKeyActive(key, now))).toHaveLength(2);
});
