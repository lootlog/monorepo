import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { CreateEventRequest } from "./schemas.js";

describe("event contracts", () => {
  it("rejects event creation with an end before its start", () => {
    expect(() =>
      Schema.decodeUnknownSync(CreateEventRequest)({
        name: "Event",
        world: "test",
        startsAt: "2026-01-02T00:00:00Z",
        endsAt: "2026-01-01T00:00:00Z",
      }),
    ).toThrow();
  });
});
