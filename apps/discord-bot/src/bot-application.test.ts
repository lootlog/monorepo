import { describe, expect, it } from "bun:test";
import { decodeNotificationCommand } from "./bot-application.js";

describe("Discord notification command decoding", () => {
  it("rejects malformed JSON without throwing", () => {
    expect(
      decodeNotificationCommand(new TextEncoder().encode("not-json")),
    ).toBeUndefined();
  });
});
