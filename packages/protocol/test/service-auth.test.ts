import { expect, test } from "bun:test";
import { Redacted } from "effect";
import { hasServiceAuthorization } from "../src/http/service-auth.js";

test("service authorization fails closed without a nonempty matching secret", () => {
  const secret = Redacted.make("service-secret");
  expect(hasServiceAuthorization("Bearer service-secret", secret)).toBe(true);
  for (const value of [
    undefined,
    "",
    "Bearer invalid-secret",
    "service-secret",
    "Bearer service-secret-extra",
  ]) {
    expect(hasServiceAuthorization(value, secret)).toBe(false);
  }
  expect(hasServiceAuthorization("Bearer service-secret", undefined)).toBe(
    false,
  );
  expect(hasServiceAuthorization("Bearer ", Redacted.make(""))).toBe(false);
});
