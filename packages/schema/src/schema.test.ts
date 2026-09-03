import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { AirTagObservationSchema, isAirTagObservation } from "./air-tag.js";
import { MapPingAckSchema } from "./map-ping.js";
import { Capability, CapabilitySchema } from "./permissions.js";

describe("shared wire schemas", () => {
  it("validates an air-tag observation through the canonical schema", () => {
    const observation = {
      targetId: "123",
      nickname: "Player",
      relation: 3,
      x: 42,
      y: 17,
    };

    expect(Schema.is(AirTagObservationSchema)(observation)).toBe(true);
    expect(isAirTagObservation(observation)).toBe(true);
    expect(isAirTagObservation({ ...observation, x: -1 })).toBe(false);
  });

  it("keeps accepted and rejected acknowledgements disjoint", () => {
    expect(
      Schema.is(MapPingAckSchema)({ status: "accepted", pingId: "ping-1" }),
    ).toBe(true);
    expect(
      Schema.is(MapPingAckSchema)({
        status: "rejected",
        code: "rate-limited",
        retryAfterMs: 1_000,
      }),
    ).toBe(true);
    expect(
      Schema.is(MapPingAckSchema)({ status: "accepted", code: "forbidden" }),
    ).toBe(false);
  });

  it("includes the precise-location presence capability", () => {
    expect(
      Schema.is(CapabilitySchema)(Capability.LOOTLOG_PRESENCE_LOCATION_READ),
    ).toBe(true);
  });
});
