import { describe, expect, it } from "bun:test";
import {
  UpdateKillPointRequest,
  UpdateRankingPointsRequest,
} from "./schemas.js";
import { Schema } from "effect";

describe("Point adjustment validation", () => {
  describe("UpdateRankingPointsRequest", () => {
    it("accepts decimal values with more than two decimal places", () => {
      expect(() =>
        Schema.decodeSync(UpdateRankingPointsRequest)({
          pointsDelta: 1.234,
        }),
      ).not.toThrow();
    });

    it("accepts negative delta values", () => {
      expect(() =>
        Schema.decodeSync(UpdateRankingPointsRequest)({
          pointsDelta: -0.25,
        }),
      ).not.toThrow();
    });

    it("rejects infinity values", () => {
      expect(() =>
        Schema.decodeSync(UpdateRankingPointsRequest)({
          pointsDelta: Number.POSITIVE_INFINITY,
        }),
      ).toThrow();
    });
  });

  describe("UpdateKillPointRequest", () => {
    it("accepts decimal values with more than two decimal places", () => {
      expect(() =>
        Schema.decodeSync(UpdateKillPointRequest)({
          pointsDelta: 0.125,
        }),
      ).not.toThrow();
    });

    it("accepts negative delta values", () => {
      expect(() =>
        Schema.decodeSync(UpdateKillPointRequest)({
          pointsDelta: -0.25,
        }),
      ).not.toThrow();
    });
  });
});
