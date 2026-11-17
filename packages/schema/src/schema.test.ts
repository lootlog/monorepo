import { describe, expect, it } from "bun:test";
import { Schema } from "effect";
import { isAirTagObservation } from "./air-tag.js";
import { MapPingAckSchema } from "./map-ping.js";

describe("shared wire schemas", () => {
  it("accepts an air-tag observation on the map and rejects one outside it", () => {
    const observation = {
      targetId: "123",
      nickname: "Player",
      relation: 3,
      x: 42,
      y: 17,
    };

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
});
