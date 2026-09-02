import {
  UpdateKillPointDto,
  UpdateRankingPointsDto,
} from "#src/http-api/lootlog-api";
import { Schema } from "effect";

describe("Update points DTO validation", () => {
  describe("UpdateRankingPointsDto", () => {
    it("accepts decimal delta values", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateRankingPointsDto)({ pointsDelta: 1.75 }),
      ).not.toThrow();
    });

    it("accepts decimal values with more than two decimal places", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateRankingPointsDto)({
          pointsDelta: 1.234,
        }),
      ).not.toThrow();
    });

    it("accepts negative delta values", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateRankingPointsDto)({
          pointsDelta: -0.25,
        }),
      ).not.toThrow();
    });

    it("rejects infinity values", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateRankingPointsDto)({
          pointsDelta: Number.POSITIVE_INFINITY,
        }),
      ).toThrow();
    });
  });

  describe("UpdateKillPointDto", () => {
    it("accepts decimal values", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateKillPointDto)({ pointsDelta: 0.25 }),
      ).not.toThrow();
    });

    it("accepts decimal values with more than two decimal places", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateKillPointDto)({ pointsDelta: 0.125 }),
      ).not.toThrow();
    });

    it("accepts negative delta values", () => {
      expect(() =>
        Schema.decodeUnknownSync(UpdateKillPointDto)({ pointsDelta: -0.25 }),
      ).not.toThrow();
    });
  });
});
