import { describe, expect, it } from "bun:test";
import {
  signActivityEvent,
  verifyActivityEventSignature,
} from "./activity-event-signature.js";

describe("activity event signature", () => {
  it("keeps stable object-key ordering", () => {
    const secret = "test-secret";
    const signature = signActivityEvent(
      { guildId: "guild", details: { z: 1, a: 2 } },
      secret,
    );
    expect(
      verifyActivityEventSignature({
        payload: { details: { a: 2, z: 1 }, guildId: "guild" },
        secret,
        signature,
      }),
    ).toBe(true);
  });

  it("fails closed for absent and malformed signatures", () => {
    expect(
      verifyActivityEventSignature({
        payload: {},
        secret: "secret",
        signature: undefined,
      }),
    ).toBe(false);
    expect(
      verifyActivityEventSignature({
        payload: {},
        secret: "secret",
        signature: "00",
      }),
    ).toBe(false);
  });
});
