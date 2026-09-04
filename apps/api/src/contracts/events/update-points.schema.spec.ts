import { describe, expect, it } from "bun:test";
import {
  UpdateKillPointRequest,
  UpdateRankingPointsRequest,
} from "#src/contracts/events/schemas";
import { Schema } from "effect";

describe("Point adjustment validation", () => {
  describe("UpdateRankingPointsRequest", () => {
    it("accepts decimal delta values", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateRankingPointsRequest)({
          pointsDelta: 1.75,
        }),
      ).not.toThrow();
    });

    it("accepts decimal values with more than two decimal places", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateRankingPointsRequest)({
          pointsDelta: 1.234,
        }),
      ).not.toThrow();
    });

    it("accepts negative delta values", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateRankingPointsRequest)({
          pointsDelta: -0.25,
        }),
      ).not.toThrow();
    });

    it("rejects infinity values", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateRankingPointsRequest)({
          pointsDelta: Number.POSITIVE_INFINITY,
        }),
      ).toThrow();
    });
  });

  describe("UpdateKillPointRequest", () => {
    it("accepts decimal values", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateKillPointRequest)({ pointsDelta: 0.25 }),
      ).not.toThrow();
    });

    it("accepts decimal values with more than two decimal places", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateKillPointRequest)({
          pointsDelta: 0.125,
        }),
      ).not.toThrow();
    });

    it("accepts negative delta values", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateKillPointRequest)({
          pointsDelta: -0.25,
        }),
      ).not.toThrow();
    });
  });
});
