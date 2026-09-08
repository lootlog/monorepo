import { describe, expect, test } from "bun:test";
import { encode } from "@msgpack/msgpack";
import {
  decodePresenceSnapshot,
  isMapPingAcknowledgement,
  isAirTagSubscriptionAcknowledgement,
  isAirTagObservationAcknowledgement,
  isPresenceFetchResult,
  decodeRealtimeFrame,
  encodeRealtimeFrame,
  RealtimeCodecError,
  tryDecodeRealtimeFrame,
} from "../src/realtime/codec.ts";
import {
  PRESENCE_EXPIRY_MS,
  PRESENCE_HEARTBEAT_INTERVAL_MS,
  type RealtimeFrame,
} from "../src/realtime/protocol.ts";

describe("realtime MessagePack codec", () => {
  test.each([false, true])(
    "preserves presence locations when included: %s",
    (includeLocation) => {
      const basePresence = {
        userId: "user-1",
        sessionId: "session-1",
        organizationIds: ["organization-1"],
        platform: "game" as const,
        status: "online" as const,
        confidence: "verified" as const,
        isAfk: false,
        lastSeen: 1_000,
      };
      const presence = includeLocation
        ? {
            ...basePresence,
            location: { map: "Kwieciste Przejście", mapId: 42, x: 4, y: 7 },
          }
        : basePresence;
      const frames = [
        {
          v: 1,
          type: "presence.snapshot",
          data: {
            organizationId: "organization-1",
            revision: 1,
            presences: [presence],
          },
        },
        {
          v: 1,
          type: "presence.delta",
          data: {
            organizationId: "organization-1",
            revision: 1,
            changes: [{ action: "upsert", presence }],
          },
        },
      ] satisfies RealtimeFrame[];
      for (const frame of frames) {
        expect(decodeRealtimeFrame(encode(frame))).toEqual(frame);
        expect(decodeRealtimeFrame(encodeRealtimeFrame(frame))).toEqual(frame);
      }
    },
  );

  test("round-trips a client command", () => {
    const frame = {
      v: 1,
      type: "presence.fetch",
      requestId: "request-1",
      data: { organizationId: "organization-1", world: "Aldous" },
    } satisfies RealtimeFrame;

    expect(decodeRealtimeFrame(encodeRealtimeFrame(frame))).toEqual(frame);
  });

  test.each([undefined, "discord-1"])(
    "round-trips presence deltas with optional Discord identity %s",
    (discordId) => {
      const identity = discordId
        ? { userId: "user-1", discordId }
        : { userId: "user-1" };
      const frame = {
        v: 1,
        type: "presence.delta",
        sequence: 9,
        data: {
          organizationId: "organization-1",
          revision: 9,
          changes: [
            {
              action: "remove",
              ...identity,
              sessionId: "session-0",
            },
            {
              action: "upsert",
              presence: {
                ...identity,
                sessionId: "session-1",
                organizationIds: ["organization-1"],
                platform: "web-app",
                status: "online",
                confidence: "verified",
                isAfk: false,
                lastSeen: 1_000,
                character: undefined,
              },
            },
          ],
        },
      } satisfies RealtimeFrame;

      expect(decodeRealtimeFrame(encodeRealtimeFrame(frame))).toEqual(frame);
    },
  );

  test("round-trips the exact legacy map ping event shape", () => {
    const frame = {
      v: 1,
      type: "map-ping.received",
      data: {
        pingId: "ping-1",
        world: "classic",
        mapId: 7,
        type: "enemy",
        x: 10,
        y: 11,
        sender: { characterId: "123", name: "Hero" },
        createdAt: 1_000,
      },
    } satisfies RealtimeFrame;
    expect(decodeRealtimeFrame(encodeRealtimeFrame(frame))).toEqual(frame);
  });

  test("rejects malformed air tag observations at the protocol boundary", () => {
    const invalid = {
      v: 1,
      type: "air-tag.observation",
      requestId: "request-1",
      data: {
        expectedMapId: 7,
        observations: [
          { targetId: "target", nickname: "Enemy", relation: 99, x: 1, y: 2 },
        ],
      },
    };
    expect(() => decodeRealtimeFrame(encode(invalid))).toThrow(
      RealtimeCodecError,
    );
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

  test("returns typed failures for untrusted frames", () => {
    const result = tryDecodeRealtimeFrame(new Uint8Array([0xc1]));
    expect(result._tag).toBe("Failure");
    if (result._tag === "Failure") {
      expect(result.failure).toBeInstanceOf(RealtimeCodecError);
      expect(result.failure.operation).toBe("decode");
    }
  });

  test("keeps heartbeat safely below expiry", () => {
    expect(PRESENCE_HEARTBEAT_INTERVAL_MS).toBe(25_000);
    expect(PRESENCE_EXPIRY_MS).toBe(60_000);
    expect(PRESENCE_HEARTBEAT_INTERVAL_MS).toBeLessThan(PRESENCE_EXPIRY_MS / 2);
  });
});

test("realtime policy snapshots and legacy permission events share the v1 codec", () => {
  const accessPolicy = {
    version: "canonical-policy-version",
    organizations: [
      {
        organizationId: "organization-1",
        owner: false,
        permissions: ["LOOTLOG_TIMERS_READ"],
        grants: [
          {
            permission: "LOOTLOG_TIMERS_READ",
            ranges: [{ from: 200, to: 500 }],
          },
        ],
      },
    ],
  } as const;
  for (const includePolicy of [false, true]) {
    const baseData = {
      organizationIds: ["organization-1"],
      subscriptionScopes: [
        { topic: "organization.timers", organizationId: "organization-1" },
      ],
    } as const;
    const data = includePolicy ? { ...baseData, accessPolicy } : baseData;
    const permissionData = includePolicy
      ? ({
          ...data,
          changes: [
            {
              organizationId: "organization-1",
              areas: ["timers"],
              restricted: true,
              expanded: false,
            },
          ],
        } as const)
      : data;
    const frames = [
      {
        v: 1,
        type: "session.joined",
        data: { ...data, connectionId: "connection-1" },
      },
      {
        v: 1,
        type: "permissions.updated",
        data: permissionData,
      },
    ] satisfies RealtimeFrame[];
    for (const frame of frames)
      expect(decodeRealtimeFrame(encodeRealtimeFrame(frame))).toEqual(frame);
  }
});

describe("presence request acknowledgement", () => {
  test("decodes the gateway snapshot and rejects malformed acknowledgements", () => {
    const snapshot = {
      organizationId: "organization-1",
      revision: 4,
      presences: [],
    };
    expect(decodePresenceSnapshot(snapshot)).toEqual(snapshot);
    expect(() =>
      decodePresenceSnapshot({ ...snapshot, presences: [{}] }),
    ).toThrow();
    expect(() => decodePresenceSnapshot({ presences: [] })).toThrow();
  });
});

describe("realtime acknowledgement validation", () => {
  test("accepts extensible acknowledgements and rejects malformed success payloads", () => {
    expect(
      isMapPingAcknowledgement({
        status: "accepted",
        pingId: "ping",
        extension: { revision: 2 },
      }),
    ).toBe(true);
    expect(isMapPingAcknowledgement({ status: "accepted", pingId: 2 })).toBe(
      false,
    );
    expect(
      isAirTagSubscriptionAcknowledgement({
        status: "accepted",
        requestId: "request",
        scopes: [],
      }),
    ).toBe(true);
    expect(
      isAirTagSubscriptionAcknowledgement({
        status: "accepted",
        requestId: "request",
        scopes: [{ guildId: "organization" }],
      }),
    ).toBe(false);
    expect(
      isAirTagObservationAcknowledgement({
        status: "accepted",
        acceptedScopes: 1,
        acceptedTargets: 2,
      }),
    ).toBe(true);
    expect(
      isAirTagObservationAcknowledgement({
        status: "accepted",
        acceptedScopes: -1,
        acceptedTargets: 2,
      }),
    ).toBe(false);
  });
  test("retains empty legacy presence responses while rejecting invalid presence arrays", () => {
    expect(isPresenceFetchResult({})).toBe(true);
    expect(isPresenceFetchResult({ presences: undefined })).toBe(true);
    expect(isPresenceFetchResult({ presences: [] })).toBe(true);
    expect(isPresenceFetchResult({ presences: null })).toBe(false);
    expect(isPresenceFetchResult({ presences: [{ platform: "game" }] })).toBe(
      false,
    );
  });
});
