import { describe, expect, it } from "bun:test";
import { Option, Schema } from "effect";
import { UserActionRequest, banExpiry } from "./user-action.js";

const accepts = (
  action: Readonly<Record<string, string | ReadonlyArray<string>>>,
) =>
  Option.isSome(
    Schema.decodeUnknownOption(UserActionRequest)({ userId: "user-1", action }),
  );

describe("UserActionRequest", () => {
  it("refuses a role outside the catalog instead of saving the rest", () => {
    expect(accepts({ action: "roles", roles: ["admin"] })).toBe(true);
    expect(accepts({ action: "roles", roles: ["admin", "superuser"] })).toBe(
      false,
    );
  });

  it("refuses a ban without a reason or with an unknown duration", () => {
    expect(accepts({ action: "ban", reason: "Spam", duration: "7d" })).toBe(
      true,
    );
    expect(accepts({ action: "ban", reason: "   ", duration: "7d" })).toBe(
      false,
    );
    expect(
      accepts({ action: "ban", reason: "Spam", duration: "forever" }),
    ).toBe(false);
  });
});

describe("banExpiry", () => {
  it("ends a timed ban after its duration and never ends a permanent one", () => {
    const now = Date.parse("2026-11-21T12:00:00.000Z");

    expect(banExpiry("24h", now)).toBe("2026-11-22T12:00:00.000Z");
    expect(banExpiry("permanent", now)).toBeNull();
  });
});
