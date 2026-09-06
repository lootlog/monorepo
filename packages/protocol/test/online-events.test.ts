import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { UserOnlineEventV1 } from "../src/rabbit/events.js";

const decode = Schema.decodeUnknownSync(UserOnlineEventV1);
const checkpoint = {
  version: 1,
  type: "checkpoint",
  userId: "user",
  sessionId: "session",
  segmentId: "segment",
  startedAt: "2026-09-01T08:00:00Z",
  endedAt: "2026-09-01T09:00:00Z",
  observedAt: "2026-09-01T09:00:00Z",
};
describe("private online event contract", () => {
  it("accepts cumulative checkpoints and collector health without a fake user", () => {
    expect(decode(checkpoint)).toEqual(checkpoint);
    expect(
      decode({
        version: 1,
        type: "collector",
        observedAt: checkpoint.observedAt,
        status: "healthy",
      }),
    ).toMatchObject({ type: "collector", status: "healthy" });
  });
  it("rejects unsupported versions, missing identity and unconfirmed or reversed intervals", () => {
    for (const invalid of [
      { ...checkpoint, version: 2 },
      { ...checkpoint, userId: "" },
      { ...checkpoint, startedAt: "2026-09-01T10:00:00Z" },
      { ...checkpoint, observedAt: "2026-09-01T08:30:00Z" },
      { ...checkpoint, endedAt: "2026-02-30T00:00:00Z" },
    ])
      expect(() => decode(invalid)).toThrow();
  });
});
