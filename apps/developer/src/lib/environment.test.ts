import { expect, test } from "bun:test";
import { getPortalEnvironment } from "./environment";
import { createdKeySchema, isApiKeyActive } from "./key-client";
test("developer hosts never cross environments and unknown hosts fail closed", () => {
  const development = getPortalEnvironment("dev-developer.lootlog.pl");
  for (const [key, value] of Object.entries(development)) {
    if (key !== "production") expect(String(value)).toMatch(/^https:\/\/dev-/);
  }
  const production = getPortalEnvironment("developer.lootlog.pl");
  for (const [key, value] of Object.entries(production)) {
    if (key !== "production") expect(String(value)).not.toContain("dev-");
  }
  expect(() => getPortalEnvironment("preview.example.com")).toThrow();
});
test("key creation validates the one-time secret and scope before displaying success", () => {
  const key = {
    id: "key-1",
    name: "Test",
    start: null,
    createdAt: "2026-09-08T00:00:00.000Z",
    expiresAt: null,
    organizationIds: ["org-1"],
    mode: "read",
    personalData: false,
    key: "secret",
  };
  expect(createdKeySchema.parse(key).key).toBe("secret");
  expect(createdKeySchema.safeParse({ ...key, key: undefined }).success).toBe(
    false,
  );
  expect(createdKeySchema.safeParse({ ...key, mode: "admin" }).success).toBe(
    false,
  );
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
