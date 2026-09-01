import { describe, expect, test } from "bun:test";
import { encode } from "@msgpack/msgpack";
import {
  decodeRealtimeFrame,
  encodeRealtimeFrame,
  RealtimeCodecError,
} from "../src/realtime/codec.ts";
import {
  PRESENCE_EXPIRY_MS,
  PRESENCE_HEARTBEAT_INTERVAL_MS,
  type RealtimeFrame,
} from "../src/realtime/protocol.ts";

describe("realtime MessagePack codec", () => {
  test("round-trips a client command", () => {
    const frame = {
      v: 1,
      type: "presence.fetch",
      requestId: "request-1",
      data: { organizationId: "organization-1", world: "Aldous" },
    } satisfies RealtimeFrame;

    expect(decodeRealtimeFrame(encodeRealtimeFrame(frame))).toEqual(frame);
  });

  test("round-trips a presence delta without exposing a location", () => {
    const frame = {
      v: 1,
      type: "presence.delta",
      sequence: 9,
      data: {
        organizationId: "organization-1",
        revision: 9,
        changes: [
          {
            action: "upsert",
            presence: {
              userId: "user-1",
              sessionId: "session-1",
              organizationIds: ["organization-1"],
              platform: "web-app",
              status: "online",
              confidence: "verified",
              isAfk: false,
              lastSeen: 1_000,
            },
          },
        ],
      },
    } satisfies RealtimeFrame;

    expect(decodeRealtimeFrame(encodeRealtimeFrame(frame))).toEqual(frame);
  });

  test("rejects malformed and unknown frames", () => {
    const malformed = new Uint8Array([0xc1]);
    expect(() => decodeRealtimeFrame(malformed)).toThrow(RealtimeCodecError);

    const unknownType = {
      v: 1,
      type: "rooms.join-raw",
      requestId: "request-1",
      data: { room: "private-room-name" },
    };
    expect(() => decodeRealtimeFrame(encode(unknownType))).toThrow(
      RealtimeCodecError,
    );
  });

  test("keeps heartbeat safely below expiry", () => {
    expect(PRESENCE_HEARTBEAT_INTERVAL_MS).toBe(25_000);
    expect(PRESENCE_EXPIRY_MS).toBe(60_000);
    expect(PRESENCE_HEARTBEAT_INTERVAL_MS).toBeLessThan(PRESENCE_EXPIRY_MS / 2);
  });
});
